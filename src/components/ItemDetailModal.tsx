// src/components/ItemDetailModal.tsx
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ItemDetailContent } from "./ItemDetailContent";
import type { ItemType, WorkspaceType } from "@/types/workspace";

interface ItemDetailModalProps {
  open: boolean;
  onClose: () => void;
  item: ItemType | null;
  workspace: WorkspaceType | null;
  token: string;
  emailToNameMap: Map<string, string> | Record<string, string>;
  onItemUpdated: (updatedItem: ItemType) => void;
  onItemDeleted: (itemId: string) => void;
}

export function ItemDetailModal({
  open,
  onClose,
  item,
  emailToNameMap,
  onItemUpdated,
  onItemDeleted,
}: ItemDetailModalProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[95vw] lg:!max-w-[1200px] !w-full h-[95vh] lg:h-[92vh] p-0 gap-0 border border-border/80 shadow-2xl bg-card text-card-foreground rounded-2xl overflow-hidden focus:outline-none">
        <DialogTitle className="sr-only">Task Details</DialogTitle>
        <DialogDescription className="sr-only">Detailed view and actions for the selected task</DialogDescription>
        <ItemDetailContent
          itemId={item._id}
          onClose={onClose}
          onItemUpdated={onItemUpdated}
          onItemDeleted={onItemDeleted}
          isModal={true}
          emailToNameMap={emailToNameMap}
        />
      </DialogContent>
    </Dialog>
  );
}