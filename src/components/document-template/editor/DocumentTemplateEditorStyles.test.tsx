import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DocumentTemplateEditorStyles } from './DocumentTemplateEditorStyles';

describe('DocumentTemplateEditorStyles', () => {
  it('verwendet im Dokument keine viewport-abhängigen rem-Maße', () => {
    const markup = renderToStaticMarkup(<DocumentTemplateEditorStyles />);

    expect(markup).not.toMatch(/\d(?:\.\d+)?rem/);
    expect(markup).toContain('font-size: 32px');
    expect(markup).toContain('margin: 0 0 20px');
    expect(markup).toContain('overflow-wrap: normal');
    expect(markup).toContain('word-break: normal');
  });

  it('verwendet für Bildauswahl und Resize-Griffe gültige OKLCH-Farbvariablen', () => {
    const markup = renderToStaticMarkup(<DocumentTemplateEditorStyles />);

    expect(markup).toContain('border: 2px solid var(--ring)');
    expect(markup).toContain('outline: 2px solid var(--ring)');
    expect(markup).not.toContain('hsl(var(--ring))');
  });

  it('entfernt Hover-Outlines bei normalen Absätzen und Überschriften', () => {
    const markup = renderToStaticMarkup(<DocumentTemplateEditorStyles />);

    expect(markup).not.toContain(
      '.document-template-page .ProseMirror p:hover'
    );
    expect(markup).not.toContain(
      '.document-template-page .ProseMirror h1:hover'
    );
    expect(markup).not.toContain(
      '.document-template-page .ProseMirror h2:hover'
    );
    expect(markup).toContain(
      '.document-template-page .document-info-box:hover'
    );
  });
});
