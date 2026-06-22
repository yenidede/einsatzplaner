import { Extension } from '@tiptap/core';

export const DocumentKeyboardShortcutsExtension = Extension.create({
  name: 'documentKeyboardShortcuts',

  addKeyboardShortcuts() {
    const insertTabStop = () => {
      const { editor } = this;

      if (editor.isActive('listItem')) {
        return editor.commands.sinkListItem('listItem');
      }

      return editor.commands.insertContent('\t');
    };

    const reduceListLevel = () => {
      const { editor } = this;
      return editor.isActive('listItem')
        ? editor.commands.liftListItem('listItem')
        : false;
    };

    return {
      Tab: insertTabStop,
      'Shift-Tab': reduceListLevel,
    };
  },
});
