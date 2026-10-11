import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { Led } from '@/components/console';

interface DeleteMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isMobile: boolean;
}

export function DeleteMessageDialog({
  isOpen,
  onClose,
  onConfirm,
  isMobile,
}: DeleteMessageDialogProps) {
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={open => !open && onClose()}>
        <DrawerContent className="pb-6">
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <Led tone="danger" blink />
              <DrawerTitle className="label-engraved text-destructive">
                PURGE TRANSMISSION
              </DrawerTitle>
            </div>
            <DrawerDescription className="font-mono text-xs text-muted-foreground">
              Confirm purge of selected packet. This will remove payload from channel history permanently.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-2 gap-2">
            <Button
              variant="destructive"
              className="h-10 font-mono text-xs font-bold"
              onClick={onConfirm}
            >
              CONFIRM PURGE
            </Button>
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="h-10 font-mono text-xs"
                onClick={onClose}
              >
                CANCEL
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] bg-card p-5">
        <DialogHeader className="gap-2 text-left">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <DialogTitle className="label-engraved text-destructive">
              PURGE TRANSMISSION
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs text-muted-foreground mt-1">
            Confirm purge of selected packet. This action permanently deletes message payload from channel log.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2 mt-4">
          <Button
            variant="outline"
            className="font-mono text-xs h-9"
            onClick={onClose}
          >
            ABORT
          </Button>
          <Button
            variant="destructive"
            className="font-mono text-xs h-9 font-bold"
            onClick={onConfirm}
          >
            CONFIRM PURGE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
