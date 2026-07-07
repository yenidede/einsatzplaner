import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentTemplateImagePropertiesPopover } from '../DocumentTemplateImagePropertiesPopover';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';

export function DocumentTemplateImageDialog({ controller }: { controller: DocumentTemplateEditorControllerModel }) {
  const {
    applySelectedImageProperties,
    deleteSelectedImage,
    hasSelectedImage,
    imagePropertiesDialogOpen,
    replaceSelectedImage,
    selectedImageProperties,
    setImagePropertiesDialogOpen,
  } = controller;

  return (
    <Dialog
      open={imagePropertiesDialogOpen && hasSelectedImage}
      onOpenChange={setImagePropertiesDialogOpen}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bild bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeiten Sie Alternativtext, Positionierung und Größe des
            ausgewählten Bildes.
          </DialogDescription>
        </DialogHeader>
        <DocumentTemplateImagePropertiesPopover
          values={selectedImageProperties}
          onApply={applySelectedImageProperties}
          onCancel={() => setImagePropertiesDialogOpen(false)}
          onReplace={replaceSelectedImage}
          onDelete={deleteSelectedImage}
        />
      </DialogContent>
    </Dialog>
  );
}
