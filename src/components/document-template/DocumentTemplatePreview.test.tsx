/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DOCUMENT_TEMPLATE_CONTENT_KIND } from '@/features/document-template/types';
import type { DocumentTemplateContent } from '@/features/document-template/types';
import { DocumentTemplatePreview } from './DocumentTemplatePreview';

const content: DocumentTemplateContent = {
  kind: DOCUMENT_TEMPLATE_CONTENT_KIND,
  version: 1,
  meta: {
    description: '',
    isDefault: false,
    sampleEinsatzId: null,
  },
  page: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: 18, right: 20, bottom: 18, left: 20 },
    header: {
      enabled: true,
      height: 18,
      showOn: 'allPages',
      blocks: [],
    },
    footer: {
      enabled: true,
      height: 14,
      showOn: 'allPages',
      blocks: [],
    },
  },
  document: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Buchungsbestätigung' }],
      },
    ],
  },
  blocks: [],
};

afterEach(() => {
  document.documentElement.style.removeProperty('font-size');
});

describe('DocumentTemplatePreview', () => {
  it('behält unabhängig von der Canvas-Breite feste A4-Maße', () => {
    const { container, rerender } = render(
      <div style={{ width: 400 }}>
        <DocumentTemplatePreview content={content} fields={{}} showAreaLabels />
      </div>
    );

    const page = container.firstElementChild?.firstElementChild;
    expect(page).toBeInstanceOf(HTMLElement);
    if (!(page instanceof HTMLElement)) return;

    expect(page.style.width).toBe('794px');
    expect(page.style.minWidth).toBe('794px');
    expect(page.style.maxWidth).toBe('794px');
    expect(page.style.height).toBe('1123px');
    expect(page.classList.contains('max-w-full')).toBe(false);

    const body = screen.getByText('Dokumentinhalt').parentElement;
    expect(body?.style.width).toBe('642px');
    expect(body?.style.minWidth).toBe('642px');
    expect(body?.style.maxWidth).toBe('642px');

    const heading = screen.getByText('Buchungsbestätigung').closest('h2');
    expect(heading?.style.fontSize).toBe('32px');
    expect(heading?.style.marginBottom).toBe('20px');

    document.documentElement.style.fontSize = '24px';

    rerender(
      <div style={{ width: 1400 }}>
        <DocumentTemplatePreview content={content} fields={{}} showAreaLabels />
      </div>
    );

    expect(page.style.width).toBe('794px');
    const rerenderedHeading = screen
      .getByText('Buchungsbestätigung')
      .closest('h2');
    expect(rerenderedHeading?.style.fontSize).toBe('32px');
    expect(rerenderedHeading?.style.marginBottom).toBe('20px');
  });
});
