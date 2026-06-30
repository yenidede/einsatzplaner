import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import type {
  TemplateImageAlign,
  TemplateImageMode,
} from './DocumentTemplateImagePropertiesPopover';

type DocumentTemplateImageContextMenuProps = {
  mode: TemplateImageMode;
  onEdit: () => void;
  onReplace: () => void;
  onDuplicate: () => void;
  onSetMode: (mode: TemplateImageMode) => void;
  onSetAlign: (align: TemplateImageAlign) => void;
  onDelete: () => void;
};

const alignmentOptions: TemplateImageAlign[] = ['left', 'center', 'right'];

export function DocumentTemplateImageContextMenu({
  mode,
  onEdit,
  onReplace,
  onDuplicate,
  onSetMode,
  onSetAlign,
  onDelete,
}: DocumentTemplateImageContextMenuProps) {
  return (
    <>
      <ContextMenuItem onClick={onEdit}>Bild bearbeiten</ContextMenuItem>
      <ContextMenuItem onClick={onReplace}>Bild ersetzen</ContextMenuItem>
      <ContextMenuItem onClick={onDuplicate}>Duplizieren</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>Positionierung</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={() => onSetMode('inline')}>
            Im Textfluss
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onSetMode('free')}>
            Frei positioniert
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger disabled={mode !== 'inline'}>
          Ausrichtung
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {alignmentOptions.map((align) => (
            <ContextMenuItem
              key={align}
              disabled={mode !== 'inline'}
              onClick={() => onSetAlign(align)}
            >
              {align === 'left'
                ? 'Links'
                : align === 'center'
                  ? 'Mitte'
                  : 'Rechts'}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={onDelete}>
        Bild löschen
      </ContextMenuItem>
    </>
  );
}
