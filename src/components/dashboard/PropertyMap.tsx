import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { getPropertyShortName } from "@/lib/propertyDisplay";

const MAPS_SCRIPT_ID = "google-maps-script";

const PropertyMap = () => {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties_map", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address, city, state, latitude, longitude")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load Google Maps script by fetching key from edge function
  useEffect(() => {
    if ((window as any).google?.maps) {
      setScriptLoaded(true);
      return;
    }
    if (document.getElementById(MAPS_SCRIPT_ID)) return;

    const load = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-maps-proxy", {
          body: { action: "get_key" },
        });
        if (error || !data?.key) {
          setMapError("Could not load Google Maps API key");
          return;
        }

        const script = document.createElement("script");
        script.id = MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.key}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => setScriptLoaded(true);
        script.onerror = () => setMapError("Failed to load Google Maps");
        document.head.appendChild(script);
      } catch {
        setMapError("Failed to load Google Maps");
      }
    };
    load();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || !(window as any).google?.maps) return;

    const google = (window as any).google;
    const propsWithCoords = properties.filter((p) => p.latitude && p.longitude);

    const center = propsWithCoords.length > 0
      ? { lat: propsWithCoords[0].latitude!, lng: propsWithCoords[0].longitude! }
      : { lat: 39.8283, lng: -98.5795 };

    mapInstance.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: propsWithCoords.length === 1 ? 14 : 4,
      mapTypeControl: false,
      streetViewControl: false,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      ],
    });

    const bounds = new google.maps.LatLngBounds();

    propsWithCoords.forEach((prop) => {
      const position = { lat: prop.latitude!, lng: prop.longitude! };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map: mapInstance.current,
        title: prop.name,
      });

      const info = new google.maps.InfoWindow({
        content: `<div style="font-family:sans-serif;padding:4px">
          <strong>${prop.name}</strong><br/>
          <span style="color:#666;font-size:13px">${prop.address}${prop.city ? `, ${prop.city}` : ""}${prop.state ? `, ${prop.state}` : ""}</span>
        </div>`,
      });

      marker.addListener("click", () => info.open(mapInstance.current, marker));
    });

    if (propsWithCoords.length > 1) {
      mapInstance.current.fitBounds(bounds, 60);
    }
  }, [scriptLoaded, properties]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="font-body text-sm text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  const propsWithCoords = properties.filter((p) => p.latitude && p.longitude);
  const propsWithoutCoords = properties.filter((p) => !p.latitude || !p.longitude);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Property Map</h2>
        <p className="font-body text-sm text-muted-foreground">
          View your properties on the map ({propsWithCoords.length} mapped)
        </p>
      </div>

      {mapError ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">{mapError}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div ref={mapRef} className="h-[450px] w-full bg-muted" />
        </Card>
      )}

      {propsWithoutCoords.length > 0 && (
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-4">
            <p className="font-body text-sm text-muted-foreground mb-2">
              {propsWithoutCoords.length} propert{propsWithoutCoords.length === 1 ? "y" : "ies"} without coordinates — edit and re-save to add to map:
            </p>
            <div className="flex flex-wrap gap-2">
              {propsWithoutCoords.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-body text-xs">
                  <MapPin className="h-3 w-3" /> {getPropertyShortName(p)}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PropertyMap;
