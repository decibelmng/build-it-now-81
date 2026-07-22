import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Copy, ExternalLink, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { useDefaultContractorLink } from "@/hooks/useDefaultContractorLink";

interface Property {
  id: string;
  name: string;
}

interface ServiceLinkPopoverProps {
  properties: Property[];
  selectedPropertyId: string | "all";
  onNavigateToLinks: () => void;
}

const LinkPanel = ({
  propertyId,
  propertyName,
  onNavigateToLinks,
}: { propertyId: string; propertyName: string; onNavigateToLinks: () => void }) => {
  const { toast } = useToast();
  const { linkUrl, ensureDefault, defaultLink } = useDefaultContractorLink(propertyId);
  // Lazy create when opened
  if (!defaultLink) ensureDefault();

  const copyLink = () => {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl);
    toast({ title: "Copied!", description: `Service link for ${propertyName}` });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-accent/10 border border-accent/30 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Service link for</p>
        <p className="text-sm font-semibold truncate">{propertyName}</p>
      </div>
      {linkUrl ? (
        <>
          <p className="text-xs text-muted-foreground">Send this to your contractor to log their visit.</p>
          <div className="flex gap-2">
            <Input readOnly value={linkUrl} className="font-mono text-xs" />
            <Button size="icon" variant="outline" onClick={copyLink} className="shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-center">
            <QRCodeSVG value={linkUrl} size={150} />
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground py-4 text-center">Preparing link…</p>
      )}
      <Button variant="link" size="sm" className="w-full text-xs" onClick={onNavigateToLinks}>
        Manage all contractor links →
      </Button>
    </div>
  );
};

const ServiceLinkPopover = ({ properties, selectedPropertyId, onNavigateToLinks }: ServiceLinkPopoverProps) => {
  const [pickedId, setPickedId] = useState<string | null>(null);

  if (properties.length === 0) return null;

  const showPicker = selectedPropertyId === "all" && properties.length > 1;
  const activeId = showPicker ? pickedId : (selectedPropertyId !== "all" ? selectedPropertyId : properties[0].id);
  const activeName = properties.find((p) => p.id === activeId)?.name || "";

  return (
    <Popover onOpenChange={(o) => { if (!o) setPickedId(null); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="font-body">
          <ExternalLink className="mr-2 h-4 w-4" />Share Service Link
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        {showPicker && !pickedId ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Which property?</p>
            <p className="text-xs text-muted-foreground">Pick the home you're sharing a service link for.</p>
            <div className="space-y-1 pt-1">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPickedId(p.id)}
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-secondary/60"
                >
                  <Home className="h-4 w-4 text-accent shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : activeId ? (
          <LinkPanel
            propertyId={activeId}
            propertyName={activeName}
            onNavigateToLinks={onNavigateToLinks}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default ServiceLinkPopover;
