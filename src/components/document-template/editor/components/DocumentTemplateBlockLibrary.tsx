import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentTemplateBlockGroup } from '../document-template-block-groups';
import { DOCUMENT_BLOCK_DRAG_MIME } from '../utils/documentTemplateEditorConstants';

export function DocumentTemplateBlockLibrary({
  groups,
  onInsert,
}: {
  groups: DocumentTemplateBlockGroup[];
  onInsert: (kind: string) => void;
}) {
  return (
    <>
      {groups.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed px-3 py-4 text-sm">
          Keine Bausteine gefunden.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-medium">
              {group.label}
            </p>
            <div className="grid gap-2">
              {group.items.map(({ id, label, description, Icon }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-auto justify-start gap-3 px-3 py-3 text-left"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'copy';
                        event.dataTransfer.setData(
                          DOCUMENT_BLOCK_DRAG_MIME,
                          id
                        );
                      }}
                      onClick={() => onInsert(id)}
                    >
                      <Icon data-icon="inline-start" />
                      <span className="flex min-w-0 flex-col items-start gap-0.5">
                        <span className="truncate font-medium">
                          {label}
                        </span>
                        <span className="text-muted-foreground line-clamp-2 text-xs font-normal whitespace-normal">
                          {description}
                        </span>
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {description}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}

