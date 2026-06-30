// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  createEditorExtensions,
  horizontalAlignmentFromPosition,
  placeCursorInFixedArea,
  updateNearestDocumentBlockAttributes,
} from './documentTemplateEditorUtils';

describe('Dokumentformatierung', () => {
  let editor: Editor | null = null;

  beforeAll(() => {
    document.elementFromPoint = () => null;
  });

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('ermittelt die Schreibposition im linken, mittleren und rechten Drittel', () => {
    expect(horizontalAlignmentFromPosition(110, 100, 300)).toBe('left');
    expect(horizontalAlignmentFromPosition(250, 100, 300)).toBe('center');
    expect(horizontalAlignmentFromPosition(390, 100, 300)).toBe('right');
  });

  it('richtet einen leeren Absatz aus und erhält bestehenden Inhalt', () => {
    editor = new Editor({
      extensions: createEditorExtensions(),
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }],
      },
    });

    placeCursorInFixedArea(editor, 'right');
    expect(editor.getJSON().content?.[0]?.attrs?.textAlign).toBe('right');

    editor.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { textAlign: 'right' },
          content: [{ type: 'text', text: 'Bestehender Kopfbereich' }],
        },
      ],
    });
    placeCursorInFixedArea(editor, 'left');

    const content = editor.getJSON().content;
    expect(content).toHaveLength(2);
    expect(editor.getText()).toContain('Bestehender Kopfbereich');
    expect(content?.[0]?.attrs?.textAlign).toBe('right');
    expect(content?.[1]?.attrs?.textAlign).toBe('left');
  });

  it('rendert Schriftgröße, Farbe und Schriftart unmittelbar', () => {
    editor = new Editor({
      extensions: createEditorExtensions(),
      content: '<p>Formatierter Text</p>',
    });

    editor.commands.setTextSelection({ from: 1, to: 18 });
    editor
      .chain()
      .setFontSize('22px')
      .setColor('#b91c1c')
      .setFontFamily('Times New Roman')
      .run();

    const html = editor.getHTML();
    expect(html).toContain('font-size: 22px');
    expect(html).toContain('color: rgb(185, 28, 28)');
    expect(html).toContain('font-family:');
    expect(html).toContain('Times New Roman');
  });

  it('ändert bei einem dynamischen Feld den umgebenden Absatz', () => {
    editor = new Editor({
      extensions: createEditorExtensions(),
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { spacingBottom: 16 },
            content: [
              {
                type: 'dynamicField',
                attrs: { fieldKey: 'assignmentDate', label: 'Datum' },
              },
            ],
          },
          {
            type: 'paragraph',
            attrs: { spacingTop: 12 },
            content: [{ type: 'text', text: 'Dauer' }],
          },
        ],
      },
    });

    let fieldPosition: number | null = null;
    editor.state.doc.descendants((node, position) => {
      if (node.type.name === 'dynamicField') {
        fieldPosition = position;
        return false;
      }
      return true;
    });

    expect(fieldPosition).not.toBeNull();
    if (fieldPosition === null) return;

    editor.commands.setNodeSelection(fieldPosition);
    expect(
      updateNearestDocumentBlockAttributes(editor, {
        spacingBottom: 0,
        lineHeight: 1,
      })
    ).toBe(true);

    const document = editor.getJSON();
    expect(document.content?.[0]?.attrs).toMatchObject({
      spacingBottom: 0,
      lineHeight: 1,
    });
    expect(document.content?.[1]?.attrs).toMatchObject({ spacingTop: 12 });
  });
});
