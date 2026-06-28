import { EditorContent } from '@tiptap/react';
import { DISABLE_HEADER_FOOTER_FOR_LAYOUT_DEBUG } from '../utils/documentTemplateEditorConstants';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';

export function DocumentTemplatePageFooter({ controller, pageIndex }: { controller: DocumentTemplateEditorControllerModel; pageIndex: number }) {
  const {
    content,
    footerEditor,
    footerHeightPx,
    handleFieldDrop,
    pageContentWidthPx,
    setActiveArea,
  } = controller;

  return (
    <>
    {!DISABLE_HEADER_FOOTER_FOR_LAYOUT_DEBUG &&
    content.page.footer.enabled ? (
      <div
        className="bg-muted/20 outline-border relative box-border flex min-w-0 flex-col justify-center overflow-hidden outline outline-1 outline-dashed"
        style={{
          width: pageContentWidthPx,
          minWidth: pageContentWidthPx,
          maxWidth: pageContentWidthPx,
          height: footerHeightPx,
          minHeight: footerHeightPx,
          maxHeight: footerHeightPx,
        }}
        onClick={() => setActiveArea('footer')}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleFieldDrop(event, 'footer')}
      >
        <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
          Fußbereich
        </span>
        <div className="min-w-0 px-[8px] pt-[16px]">
          {pageIndex === 0 ? (
            <EditorContent editor={footerEditor} />
          ) : (
            <span className="text-muted-foreground text-xs">
              Seite {pageIndex + 1}
            </span>
          )}
        </div>
      </div>
    ) : DISABLE_HEADER_FOOTER_FOR_LAYOUT_DEBUG ? null : (
      <div />
    )}
    </>
  );
}
