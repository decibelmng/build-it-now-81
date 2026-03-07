import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, QrCode, Share2, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface QuickShareCardProps {
  linkUrl: string;
}

const QuickShareCard = ({ linkUrl }: QuickShareCardProps) => {
  const { toast } = useToast();
  const [showQr, setShowQr] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(linkUrl);
    toast({ title: "Copied!" });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Service Log Link", url: linkUrl });
      } catch {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  return (
    <Card className="border-t-4 border-t-accent bg-accent/5">
      <CardContent className="py-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold">Your Property Service Link</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Share this permanent link with any contractor or service provider. They can log their work without creating an account.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex gap-2">
          <Input readOnly value={linkUrl} className="font-mono text-xs bg-background" />
          <Button onClick={copyLink} className="shrink-0">
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
            <QRCodeSVG value={linkUrl} size={160} />
            <p className="text-xs text-muted-foreground">Scan to open the service log form</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickShareCard;
