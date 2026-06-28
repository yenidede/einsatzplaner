// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';
import {
  InfoBoxNode,
  insertParagraphAfterInfoBoxAtEnd,
} from './document-template-nodes';

describe('InfoBoxNode', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('erstellt mit Enter nach dem letzten Absatz einen direkt folgenden Absatz', () => {
    editor = new Editor({
      extensions: [StarterKit, InfoBoxNode],
      content: {
        type: 'doc',
        content: [
          {
            type: 'infoBox',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Gesamtpreis' }],
              },
            ],
          },
        ],
      },
    });

    editor.commands.selectTextblockEnd();
    expect(insertParagraphAfterInfoBoxAtEnd(editor)).toBe(true);

    expect(editor.getJSON().content?.slice(0, 2)).toEqual([
      {
        type: 'infoBox',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Gesamtpreis' }],
          },
        ],
      },
      { type: 'paragraph' },
    ]);
    expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    expect(editor.state.selection.$from.depth).toBe(1);
    expect(editor.state.selection.$from.index(0)).toBe(1);
  });
});
