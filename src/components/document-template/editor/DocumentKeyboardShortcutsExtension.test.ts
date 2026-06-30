// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditorExtensions } from './utils/documentTemplateEditorUtils';
import { DOCUMENT_TAB_STOP_PX } from './DocumentKeyboardShortcutsExtension';

describe('Dokument-Tabstopps', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  function createEditor(text = 'Ein längerer Absatz') {
    editor = new Editor({
      extensions: createEditorExtensions(),
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: text ? [{ type: 'text', text }] : [],
          },
        ],
      },
    });
    return editor;
  }

  it('rückt am Absatzanfang den gesamten Absatz ein', () => {
    const currentEditor = createEditor();
    currentEditor.commands.setTextSelection(1);

    expect(currentEditor.commands.keyboardShortcut('Tab')).toBe(true);
    expect(currentEditor.getJSON().content?.[0]?.attrs?.indent).toBe(
      DOCUMENT_TAB_STOP_PX
    );
    expect(currentEditor.getText()).toBe('Ein längerer Absatz');
  });

  it('entfernt den Einzug am Absatzanfang mit Backspace', () => {
    const currentEditor = createEditor();
    currentEditor.commands.setTextSelection(1);
    currentEditor.commands.keyboardShortcut('Tab');

    expect(currentEditor.commands.keyboardShortcut('Backspace')).toBe(true);
    expect(currentEditor.getJSON().content?.[0]?.attrs?.indent).toBe(0);
  });

  it('behält den Einzug in einem mit Enter erzeugten Absatz bei', () => {
    const currentEditor = createEditor('Eingerückter Absatz');
    currentEditor.commands.setTextSelection(1);
    currentEditor.commands.keyboardShortcut('Tab');
    currentEditor.commands.setTextSelection(20);

    expect(currentEditor.commands.keyboardShortcut('Enter')).toBe(true);
    expect(currentEditor.getJSON().content).toHaveLength(2);
    expect(currentEditor.getJSON().content?.[1]?.attrs?.indent).toBe(
      DOCUMENT_TAB_STOP_PX
    );
  });

  it('behält einen Tab mitten im Text als Tabzeichen', () => {
    const currentEditor = createEditor('Programm:Führungsprogramm');
    currentEditor.commands.setTextSelection(10);

    expect(currentEditor.commands.keyboardShortcut('Tab')).toBe(true);
    expect(currentEditor.getText()).toBe('Programm:\tFührungsprogramm');
    expect(currentEditor.getJSON().content?.[0]?.attrs?.indent).toBe(0);
  });

  it('überführt bestehende führende Tabzeichen in einen Absatzeinzug', () => {
    const currentEditor = createEditor('\tText');
    currentEditor.commands.setTextSelection(2);

    expect(currentEditor.commands.keyboardShortcut('Tab')).toBe(true);
    expect(currentEditor.getText()).toBe('Text');
    expect(currentEditor.getJSON().content?.[0]?.attrs?.indent).toBe(
      DOCUMENT_TAB_STOP_PX * 2
    );
  });
});
