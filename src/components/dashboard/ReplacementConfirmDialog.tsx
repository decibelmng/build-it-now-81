import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existingName: string;
  newName?: string;
  onYes: () => void;
  onNo: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
}

const ReplacementConfirmDialog = ({
  open,
  onOpenChange,
  existingName,
  newName,
  onYes,
  onNo,
  onAddNew,
  addNewLabel = "Also add the new one to inventory",
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Is this a replacement?</DialogTitle>
          <DialogDescription className="font-body">
            {newName
              ? <>Is <strong>{newName}</strong> replacing your existing <strong>{existingName}</strong>?</>
              : <>Is this replacing your existing <strong>{existingName}</strong>?</>}
            <span className="block mt-2 text-xs text-muted-foreground">
              We'll keep the old one on your timeline as history — nothing gets deleted.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={onYes}
            className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body"
          >
            Yes, it's a replacement
          </Button>
          <Button
            variant="outline"
            onClick={onNo}
            className="w-full rounded-full font-body"
          >
            No, we have both
          </Button>
          {onAddNew && (
            <Button
              variant="ghost"
              onClick={onAddNew}
              className="w-full rounded-full font-body text-sm"
            >
              {addNewLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReplacementConfirmDialog;
