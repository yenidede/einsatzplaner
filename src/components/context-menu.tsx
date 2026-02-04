import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { handlePdfGenerate, handleDelete } from './event-calendar/utils';
import { useAlertDialog } from '@/contexts/AlertDialogContext';
import { usePdfGenerator } from '@/features/pdf/hooks/usePdfGenerator';

interface ContextMenuEventRightClickProps {
  trigger: React.ReactNode;
  heading?: string;
  asChild?: boolean;
  eventId: string;
  eventTitle: string;
  onDelete: (eventId: string, eventTitle: string) => void;
  einsatzSingular?: string;
  canConfirm?: boolean;
  onConfirm?: (eventId: string) => void;
}

export function ContextMenuEventRightClick({
  trigger,
  heading,
  asChild = true,
  eventId,
  eventTitle,
  onDelete,
  einsatzSingular = 'Einsatz',
  canConfirm = false,
  onConfirm,
}: ContextMenuEventRightClickProps) {
  const { showDialog } = useAlertDialog();
  const { generatePdf } = usePdfGenerator();

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleDelete(
      einsatzSingular,
      { id: eventId, title: eventTitle },
      showDialog,
      onDelete
    );
  };

  const handlePDFClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handlePdfGenerate(
      einsatzSingular,
      { id: eventId, title: eventTitle },
      generatePdf
    );
  };

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm?.(eventId);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild={asChild}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {trigger}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52" onClick={(e) => e.stopPropagation()}>
        {heading && <ContextMenuLabel>{heading}</ContextMenuLabel>}
        {canConfirm && onConfirm && (
          <ContextMenuItem onClick={handleConfirmClick}>
            Als bestätigt markieren
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handlePDFClick}>
          PDF Generieren
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDeleteClick} variant="destructive">
          Löschen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
