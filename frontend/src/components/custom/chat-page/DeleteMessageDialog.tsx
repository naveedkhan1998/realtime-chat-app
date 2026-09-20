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
            <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DrawerTitle className="text-base font-bold">Delete Message</DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete this message? This action will permanently remove it from the conversation for everyone.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-2 gap-2">
            <Button
              variant="destructive"
              className="h-11 rounded-xl text-sm font-semibold shadow-xs"
              onClick={onConfirm}
            >
              Delete for everyone
            </Button>
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="h-11 rounded-xl text-sm font-medium border-border/70"
                onClick={onClose}
              >
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[420px] rounded-3xl border-border/70 bg-card/95 backdrop-blur-xl p-6">
        <DialogHeader className="gap-2">
          <div className="w-10 h-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold">Delete Message</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            variant="outline"
            className="rounded-xl text-xs h-10"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl text-xs font-semibold h-10"
            onClick={onConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
