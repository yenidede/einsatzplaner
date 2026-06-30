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

  it('zeigt Rich-Text-Inhalte im Kopf- und Fußbereich an', () => {
    const fixedAreaContent: DocumentTemplateContent = {
      ...content,
      page: {
        ...content.page,
        header: {
          ...content.page.header,
          blocks: [
            {
              id: 'header-1',
              type: 'header',
              richText: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Kopfzeileninhalt' }],
                  },
                ],
              },
            },
          ],
        },
        footer: {
          ...content.page.footer,
          blocks: [
            {
              id: 'footer-1',
              type: 'footer',
              richText: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Fußzeileninhalt' }],
                  },
                ],
              },
            },
          ],
        },
      },
    };

    render(<DocumentTemplatePreview content={fixedAreaContent} fields={{}} />);

    expect(screen.getByText('Kopfzeileninhalt')).toBeTruthy();
    expect(screen.getByText('Fußzeileninhalt')).toBeTruthy();
  });

  it('zeigt Schriftformatierung und enge Absatzabstände an', () => {
    const formattedContent: DocumentTemplateContent = {
      ...content,
      document: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { spacingTop: 0, spacingBottom: 0, lineHeight: 1 },
            content: [
              {
                type: 'text',
                text: 'Direkt formatiert',
                marks: [
                  {
                    type: 'textStyle',
                    attrs: {
                      fontSize: '22px',
                      color: '#b91c1c',
                      fontFamily: 'Times New Roman',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    render(<DocumentTemplatePreview content={formattedContent} fields={{}} />);

    const text = screen.getByText('Direkt formatiert');
    const paragraph = text.closest('p');
    expect(text.style.fontSize).toBe('22px');
    expect(text.style.color).toBe('rgb(185, 28, 28)');
    expect(text.style.fontFamily).toContain('Times New Roman');
    expect(paragraph?.style.marginBottom).toBe('0px');
    expect(paragraph?.style.lineHeight).toBe('1');
  });
});
