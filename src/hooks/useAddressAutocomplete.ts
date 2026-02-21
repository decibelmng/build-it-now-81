import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Prediction {
  place_id: string;
  description: string;
}

interface AddressComponents {
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
}

export const useAddressAutocomplete = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.length < 3) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-maps-proxy", {
          body: { action: "autocomplete", input },
        });
        if (!error && data?.predictions) {
          setPredictions(data.predictions.slice(0, 5));
        }
      } catch (e) {
        console.error("Autocomplete error:", e);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const getDetails = useCallback(async (placeId: string): Promise<AddressComponents | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("google-maps-proxy", {
        body: { action: "details", placeId },
      });
      if (error || !data?.result) return null;

      const components = data.result.address_components || [];
      const geo = data.result.geometry?.location;

      const get = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.short_name || "";
      const getLong = (type: string) =>
        components.find((c: any) => c.types.includes(type))?.long_name || "";

      const streetNumber = getLong("street_number");
      const route = getLong("route");

      return {
        address: `${streetNumber} ${route}`.trim(),
        city: getLong("locality") || getLong("sublocality") || getLong("administrative_area_level_2"),
        state: get("administrative_area_level_1"),
        zip: get("postal_code"),
        latitude: geo?.lat ?? null,
        longitude: geo?.lng ?? null,
      };
    } catch (e) {
      console.error("Place details error:", e);
      return null;
    }
  }, []);

  const clear = useCallback(() => setPredictions([]), []);

  return { predictions, loading, search, getDetails, clear };
};
