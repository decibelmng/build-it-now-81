import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, QrCode, Share2, Info, Home } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface QuickShareCardProps {
  linkUrl: string;
  propertyName: string;
  compact?: boolean;
}

const QuickShareCard = ({ linkUrl, propertyName, compact = false }: QuickShareCardProps) => {
  const { toast } = useToast();
  const [showQr, setShowQr] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    toast({ title: "Copied!", description: `Service link for ${propertyName}` });
  };

  const shareLink = async () => {
    const title = `Service log link — ${propertyName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url: linkUrl });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <Card className="border-t-4 border-t-accent bg-accent/5">
      <CardContent className={compact ? "py-4 space-y-3" : "py-5 space-y-4"}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Home className="h-4 w-4 text-accent shrink-0" />
            <h3 className={`font-display font-semibold truncate ${compact ? "text-base" : "text-lg"}`}>
              Service link for {propertyName}
            </h3>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Share this permanent link with any contractor. They can log their work against this property without creating an account.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex gap-2">
          <Input readOnly value={linkUrl} className="font-mono text-xs bg-background" />
          <Button onClick={copyLink} className="shrink-0" size={compact ? "sm" : "default"}>
            <Copy className="mr-2 h-4 w-4" />Copy
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowQr(!showQr)}>
            <QrCode className="mr-2 h-4 w-4" />{showQr ? "Hide QR" : "QR Code"}
          </Button>
          <Button variant="outline" size="sm" onClick={shareLink}>
            <Share2 className="mr-2 h-4 w-4" />Share
          </Button>
        </div>

        {showQr && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <QRCodeSVG value={linkUrl} size={compact ? 140 : 160} />
            <p className="text-xs text-muted-foreground">Scan to open the service log form for {propertyName}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickShareCard;
