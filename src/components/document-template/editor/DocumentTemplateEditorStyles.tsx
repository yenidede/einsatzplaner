export function DocumentTemplateEditorStyles() {
  return (
    <style jsx global>{`
      .document-template-page .ProseMirror {
        box-sizing: border-box;
        min-height: 0;
        max-width: none;
        outline: none;
        color: hsl(var(--foreground));
        font-size: 16px;
        line-height: 1.7;
        overflow-wrap: anywhere;
        position: relative;
        tab-size: 4;
        white-space: pre-wrap;
      }

      .document-template-page .document-template-body-editor {
        min-height: 100%;
      }

      .document-template-page .document-template-area-editor {
        max-height: 100%;
        min-height: 100%;
        overflow: hidden;
        font-size: 12px;
        line-height: 1.35;
      }

      .document-template-page .ProseMirror p {
        margin: 0 0 16px;
      }

      .document-template-page .document-template-area-editor p {
        margin: 0;
        overflow-wrap: anywhere;
      }

      .document-template-page .ProseMirror h1 {
        font-size: 32px;
        line-height: 1.2;
        margin: 0 0 20px;
        font-weight: 650;
        overflow-wrap: normal;
        word-break: normal;
      }

      .document-template-page .ProseMirror h2 {
        font-size: 23.2px;
        line-height: 1.25;
        margin: 0 0 16px;
        font-weight: 620;
        overflow-wrap: normal;
        word-break: normal;
      }

      .document-template-page .ProseMirror p:hover,
      .document-template-page .ProseMirror h1:hover,
      .document-template-page .ProseMirror h2:hover,
      .document-info-box:hover {
        outline: 1px solid hsl(var(--ring) / 0.25);
        outline-offset: 4px;
      }

      .document-template-page .ProseMirror ul,
      .document-template-page .ProseMirror ol {
        margin: 0 0 16px 22.4px;
        padding: 0;
      }

      .document-template-page .ProseMirror hr {
        border: 0;
        border-top: 1px solid hsl(var(--border));
        margin: 24px 0;
      }

      .document-template-page .ProseMirror table {
        border-collapse: collapse;
        margin: 16px 0;
        width: 100%;
      }

      .document-template-page .ProseMirror td,
      .document-template-page .ProseMirror th {
        border: 1px solid hsl(var(--border));
        padding: 8px 10.4px;
        vertical-align: top;
      }

      .document-template-page .ProseMirror th {
        background: hsl(var(--muted));
        font-weight: 600;
      }

      .document-info-box {
        background: hsl(var(--muted) / 0.55);
        border-radius: 8px;
        margin: 16px 0;
        padding: 16px;
      }

      .document-template-body-measure {
        box-sizing: border-box;
      }

      .document-field-chip {
        display: inline-flex;
        align-items: center;
        border-radius: 6px;
        background: hsl(var(--secondary));
        color: hsl(var(--secondary-foreground));
        cursor: pointer;
        font-size: 0.875em;
        line-height: 1;
        padding: 2.88px 6.72px;
        user-select: none;
        white-space: nowrap;
      }

      .document-template-page .ProseMirror-selectednode.document-field-chip {
        background: hsl(var(--primary));
        color: hsl(var(--primary-foreground));
        outline: 2px solid hsl(var(--ring));
        outline-offset: 2px;
      }

      .document-page-break {
        align-items: center;
        color: hsl(var(--muted-foreground));
        display: flex;
        font-size: 12px;
        gap: 12px;
        margin: 32px 0;
        min-height: 680px;
      }

      .document-page-break::before,
      .document-page-break::after {
        background: hsl(var(--border));
        content: '';
        flex: 1;
        height: 1px;
      }

      .document-template-image-wrapper {
        display: flex;
        margin: 8px 0;
      }

      .document-template-image-wrapper-free {
        cursor: grab;
        display: block;
        margin: 0;
        position: absolute;
        z-index: 5;
      }

      .document-template-image-wrapper-free:active {
        cursor: grabbing;
      }

      .document-template-image-content {
        align-items: center;
        display: inline-flex;
        justify-content: center;
        position: relative;
      }

      .document-template-image-wrapper-left {
        justify-content: flex-start;
      }

      .document-template-image-wrapper-center {
        justify-content: center;
      }

      .document-template-image-wrapper-right {
        justify-content: flex-end;
      }

      .document-template-image {
        max-width: 100%;
      }

      .document-template-image-placeholder {
        align-items: center;
        border: 1px dashed hsl(var(--border));
        border-radius: 6px;
        color: hsl(var(--muted-foreground));
        display: inline-flex;
        font-size: 12px;
        justify-content: center;
        padding: 5.6px 9.6px;
        text-align: center;
      }

      .document-template-image-resize-handle {
        background: hsl(var(--background));
        border: 2px solid hsl(var(--ring));
        border-radius: 999px;
        bottom: -7px;
        box-shadow: 0 1px 4px hsl(var(--foreground) / 0.18);
        cursor: nwse-resize;
        display: none;
        height: 14px;
        position: absolute;
        right: -7px;
        touch-action: none;
        width: 14px;
      }

      .ProseMirror-selectednode .document-template-image,
      .ProseMirror-selectednode.document-template-image,
      .ProseMirror-selectednode.document-template-image-wrapper,
      .ProseMirror-selectednode .document-template-image-content {
        outline: 2px solid hsl(var(--ring));
        outline-offset: 3px;
      }

      .ProseMirror-selectednode .document-template-image-resize-handle {
        display: block;
      }
    `}</style>
  );
}
