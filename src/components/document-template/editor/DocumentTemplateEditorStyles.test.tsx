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
});
