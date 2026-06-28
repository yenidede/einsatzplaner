import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';

export function DocumentTemplatePageDeleteDialog({
  controller,
}: {
  controller: DocumentTemplateEditorControllerModel;
}) {
  const { deletePage, pageToDelete, setPageToDelete } = controller;

  return (
    <AlertDialog
      open={pageToDelete !== null}
      onOpenChange={(open) =>
        setPageToDelete(open ? pageToDelete : null)
      }
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Seite {pageToDelete === null ? '' : pageToDelete + 1}{' '}
            löschen?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Diese Seite und alle Inhalte darauf werden dauerhaft
            aus der Dokumentvorlage entfernt. Diese Aktion kann
            nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (pageToDelete !== null) {
                deletePage(pageToDelete);
              }
            }}
          >
            Seite löschen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
