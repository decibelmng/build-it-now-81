import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Copy, ExternalLink, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface ServiceLinkPopoverProps {
  linkUrl: string;
  onNavigateToLinks: () => void;
}

const ServiceLinkPopover = ({ linkUrl, onNavigateToLinks }: ServiceLinkPopoverProps) => {
  const { toast } = useToast();

  const copyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    toast({ title: "Copied!" });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="font-body">
          <ExternalLink className="mr-2 h-4 w-4" />Share Service Link
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3" align="end">
        <p className="text-sm font-medium">Send this to your contractor to log their service visit</p>
        <div className="flex gap-2">
          <Input readOnly value={linkUrl} className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={copyLink} className="shrink-0">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-center">
          <QRCodeSVG value={linkUrl} size={150} />
        </div>
        <Button variant="link" size="sm" className="w-full text-xs" onClick={onNavigateToLinks}>
          Manage all contractor links →
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default ServiceLinkPopover;
