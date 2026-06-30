import { describe, expect, it } from 'vitest';
import { inflateRawSync } from 'node:zlib';
import type {
  DocumentTemplateContent,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import { DOCUMENT_TEMPLATE_CONTENT_KIND } from '@/features/document-template/types';
import { renderDocumentTemplateDocx } from './document-docx-exporter';
import { normalizeTemplateText } from './document-template-renderer';

const transparentPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function mojibake(value: string): string {
  return String.fromCharCode(...new TextEncoder().encode(value));
}

function field(value: string) {
  return {
    definition: {
      key: value,
      label: value,
      group: 'general',
      description: value,
      source: 'standard',
      dataType: 'text',
    },
    rawValue: value,
    formattedValue: value,
  } satisfies ResolvedDocumentTemplateFields[string];
}

async function readDocxPart(buffer: Buffer, path: string) {
  const file = readZipFile(buffer, path);
  expect(file, `${path} existiert im DOCX`).not.toBeNull();
  return file?.toString('utf8') ?? '';
}

function readZipFile(buffer: Buffer, path: string): Buffer | null {
  const endOfCentralDirectory = findEndOfCentralDirectory(buffer);
  if (endOfCentralDirectory === -1) {
    return null;
  }

  const centralDirectorySize = buffer.readUInt32LE(endOfCentralDirectory + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(
    endOfCentralDirectory + 16
  );
  let offset = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  while (offset < centralDirectoryEnd) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      return null;
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString('utf8');

    if (fileName === path) {
      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataOffset =
        localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedData = buffer.subarray(
        dataOffset,
        dataOffset + compressedSize
      );

      if (compressionMethod === 0) {
        return compressedData;
      }

      if (compressionMethod === 8) {
        return inflateRawSync(compressedData);
      }

      return null;
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return null;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      return index;
    }
  }

  return -1;
}

describe('renderDocumentTemplateDocx', () => {
  it('exportiert Rich-Text-Blöcke, Umlaute, Bilder und Kopf-/Fußbereich vollständig', async () => {
    const content: DocumentTemplateContent = {
      kind: DOCUMENT_TEMPLATE_CONTENT_KIND,
      version: 1,
      meta: {
        description: '',
        defaultFormat: 'docx',
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
          blocks: [
            {
              id: 'header',
              type: 'header',
              richText: {
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    attrs: { textAlign: 'right', spacingBottom: 0 },
                    content: [
                      {
                        type: 'dynamicField',
                        attrs: { fieldKey: 'organizationName' },
                      },
                      {
                        type: 'text',
                        text: ` · ${mojibake('Buchungsbestätigung')}`,
                      },
                    ],
                  },
                ],
              },
              align: 'right',
            },
          ],
        },
        footer: {
          enabled: true,
          height: 14,
          showOn: 'allPages',
          blocks: [
            {
              id: 'footer',
              type: 'footer',
              text: '{{organizationEmail}} · Seite {{pageNumber}}',
              align: 'center',
              showPageNumber: true,
            },
          ],
        },
      },
      document: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1, spacingBottom: 18 },
            content: [
              { type: 'text', text: mojibake('Abschnittsüberschrift') },
            ],
          },
          {
            type: 'templateImage',
            attrs: {
              src: transparentPng,
              width: 240,
              height: 96,
              align: 'left',
              mode: 'inline',
            },
          },
          {
            type: 'infoBox',
            attrs: { spacingTop: 8, spacingBottom: 20 },
            content: [
              {
                type: 'paragraph',
                attrs: { spacingBottom: 10 },
                content: [
                  { type: 'text', text: 'Datum' },
                  { type: 'hardBreak' },
                  {
                    type: 'dynamicField',
                    attrs: { fieldKey: 'assignmentDate' },
                  },
                ],
              },
              {
                type: 'paragraph',
                attrs: { spacingBottom: 10 },
                content: [
                  { type: 'text', text: 'Uhrzeit' },
                  { type: 'hardBreak' },
                  {
                    type: 'dynamicField',
                    attrs: { fieldKey: 'assignmentStartTime' },
                  },
                  { type: 'text', text: ' bis ' },
                  {
                    type: 'dynamicField',
                    attrs: { fieldKey: 'assignmentEndTime' },
                  },
                ],
              },
              {
                type: 'paragraph',
                attrs: { spacingBottom: 0 },
                content: [
                  { type: 'text', text: 'Ort / Programm' },
                  { type: 'hardBreak' },
                  { type: 'dynamicField', attrs: { fieldKey: 'location' } },
                  { type: 'text', text: ' · ' },
                  { type: 'dynamicField', attrs: { fieldKey: 'programName' } },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            attrs: { spacingBottom: 14, lineHeight: 1.15 },
            content: [
              {
                type: 'text',
                text: mojibake(
                  'Hinweis oder wichtige Information für die Buchung.'
                ),
                marks: [
                  {
                    type: 'textStyle',
                    attrs: {
                      fontSize: '18px',
                      color: '#2563eb',
                      fontFamily: 'Times New Roman',
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Programm / Einsatz' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            type: 'dynamicField',
                            attrs: { fieldKey: 'programName' },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      blocks: [],
    };
    const fields: ResolvedDocumentTemplateFields = {
      organizationName: field('Organisation Ö'),
      organizationEmail: field('office@example.org'),
      assignmentDate: field('24.06.2026'),
      assignmentStartTime: field('10:00 Uhr'),
      assignmentEndTime: field('12:00 Uhr'),
      location: field('Wien'),
      programName: field('Führung Spezial'),
      pageNumber: field('{{pageNumber}}'),
    };

    const buffer = await renderDocumentTemplateDocx({
      templateName: 'Test',
      content,
      fields,
    });
    const documentXml = await readDocxPart(buffer, 'word/document.xml');
    const headerXml = await readDocxPart(buffer, 'word/header1.xml');
    const footerXml = await readDocxPart(buffer, 'word/footer1.xml');

    expect(normalizeTemplateText(mojibake('Abschnittsüberschrift'))).toBe(
      'Abschnittsüberschrift'
    );
    expect(documentXml).toContain('Abschnittsüberschrift');
    expect(documentXml).toContain(
      'Hinweis oder wichtige Information für die Buchung.'
    );
    expect(documentXml).toContain('Datum');
    expect(documentXml).toContain('24.06.2026');
    expect(documentXml).toContain('Uhrzeit');
    expect(documentXml).toContain('10:00 Uhr');
    expect(documentXml).toContain('12:00 Uhr');
    expect(documentXml).toContain('Ort / Programm');
    expect(documentXml).toContain('Wien');
    expect(documentXml).toContain('Programm / Einsatz');
    expect(documentXml).toContain('Führung Spezial');
    expect(documentXml).not.toContain('AbschnittsÃ');
    expect(documentXml).not.toContain(mojibake('fü').slice(0, 2));
    expect(documentXml).toContain('w:sz w:val="48"');
    expect(documentXml).toContain('w:sz w:val="27"');
    expect(documentXml).toContain('Times New Roman');
    expect(documentXml).toContain('w:line="276"');
    expect(documentXml).toContain('wp:extent cx="2286000" cy="914400"');
    expect(headerXml).toContain('Organisation Ö');
    expect(headerXml).toContain('Buchungsbestätigung');
    expect(footerXml).toContain('office@example.org');
    expect(footerXml).toContain('Seite');
  });
});
