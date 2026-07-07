import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';

export function DocumentTemplatePageActions({ controller, pageIndex }: { controller: DocumentTemplateEditorControllerModel; pageIndex: number }) {
  const {
    pageCount,
    setPageToDelete,
  } = controller;

  return (
    <>
    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-70 focus-within:opacity-100 hover:opacity-100">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={pageCount <= 1}
              aria-label={`Seite ${pageIndex + 1} löschen`}
              onClick={() => setPageToDelete(pageIndex)}
            >
              <Trash2 data-icon="inline-start" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {pageCount <= 1
            ? 'Die letzte Seite kann nicht gelöscht werden.'
            : `Seite ${pageIndex + 1} löschen`}
        </TooltipContent>
      </Tooltip>
      {/* <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  aria-label={`Aktionen für Seite ${pageIndex + 1}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              Aktionen für Seite {pageIndex + 1}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              disabled={pageCount <= 1}
              onSelect={() => setPageToDelete(pageIndex)}
            >
              <Trash2 data-icon="inline-start" />
              Seite {pageIndex + 1} löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
    </div>
    </>
  );
}
