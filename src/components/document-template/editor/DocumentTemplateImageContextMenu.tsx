import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  TEMPLATE_IMAGE_LAYOUT_OPTIONS,
  type TemplateImageLayout,
} from '@/features/document-template/lib/document-template-image-layout';

type DocumentTemplateImageContextMenuProps = {
  layout: TemplateImageLayout;
  onEdit: () => void;
  onReplace: () => void;
  onDuplicate: () => void;
  onSetLayout: (layout: TemplateImageLayout) => void;
  onDelete: () => void;
};

export function DocumentTemplateImageContextMenu({
  layout,
  onEdit,
  onReplace,
  onDuplicate,
  onSetLayout,
  onDelete,
}: DocumentTemplateImageContextMenuProps) {
  return (
    <>
      <ContextMenuItem onClick={onEdit}>
        Bild bearbeiten / Größe
      </ContextMenuItem>
      <ContextMenuItem onClick={onReplace}>Bild ersetzen</ContextMenuItem>
      <ContextMenuItem onClick={onDuplicate}>Duplizieren</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuSub>
        <ContextMenuSubTrigger>Layout</ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {TEMPLATE_IMAGE_LAYOUT_OPTIONS.map((option) => (
            <ContextMenuItem
              key={option.value}
              onClick={() => onSetLayout(option.value)}
            >
              {option.label}
              {layout === option.value ? ' ✓' : ''}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      {layout === 'absolute' ? (
        <ContextMenuItem disabled>
          Dieses Bild kann Text überdecken.
        </ContextMenuItem>
      ) : null}
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={onDelete}>
        Bild löschen
      </ContextMenuItem>
    </>
  );
}
