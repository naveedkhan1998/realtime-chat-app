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
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Delete Message</DrawerTitle>
            <DrawerDescription>
              Are you sure you want to delete this message? This action cannot be
              undone.
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pt-2">
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" onClick={onClose}>
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Message</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this message? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
