import { Extension } from '@tiptap/core';

export const DOCUMENT_TAB_STOP_PX = 48;

function numericIndent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

export const DocumentKeyboardShortcutsExtension = Extension.create({
  name: 'documentKeyboardShortcuts',

  addKeyboardShortcuts() {
    const changeBlockIndent = (direction: 1 | -1) => {
      const { editor } = this;
      const { $from } = editor.state.selection;

      if (!$from.parent.isTextblock) return false;

      const indent = numericIndent($from.parent.attrs.indent);
      const nextIndent = Math.max(
        0,
        indent + direction * DOCUMENT_TAB_STOP_PX
      );

      if (nextIndent === indent) return false;

      return editor.commands.updateAttributes($from.parent.type.name, {
        indent: nextIndent,
      });
    };

    const insertTabStop = () => {
      const { editor } = this;

      if (editor.isActive('listItem')) {
        return editor.commands.sinkListItem('listItem');
      }

      const { empty, $from } = editor.state.selection;
      if (empty && $from.parent.isTextblock) {
        if ($from.parentOffset === 0) {
          return changeBlockIndent(1);
        }

        const contentBeforeCursor = $from.parent.textBetween(
          0,
          $from.parentOffset,
          '',
          ''
        );
        if (/^\t+$/.test(contentBeforeCursor)) {
          const indent =
            numericIndent($from.parent.attrs.indent) +
            (contentBeforeCursor.length + 1) * DOCUMENT_TAB_STOP_PX;

          return editor
            .chain()
            .deleteRange({ from: $from.start(), to: $from.pos })
            .updateAttributes($from.parent.type.name, { indent })
            .run();
        }
      }

      return editor.commands.insertContent('\t');
    };

    const reduceListLevel = () => {
      const { editor } = this;
      return editor.isActive('listItem')
        ? editor.commands.liftListItem('listItem')
        : changeBlockIndent(-1);
    };

    const removeBlockIndent = () => {
      const { editor } = this;
      const { empty, $from } = editor.state.selection;

      if (
        !empty ||
        !$from.parent.isTextblock ||
        $from.parentOffset !== 0 ||
        numericIndent($from.parent.attrs.indent) === 0
      ) {
        return false;
      }

      return changeBlockIndent(-1);
    };

    const keepBlockIndentOnNewParagraph = () => {
      const { editor } = this;
      const { $from } = editor.state.selection;
      const indent = numericIndent($from.parent.attrs.indent);

      if (
        !$from.parent.isTextblock ||
        indent === 0 ||
        editor.isActive('listItem') ||
        !editor.commands.splitBlock({ keepMarks: true })
      ) {
        return false;
      }

      return editor.commands.updateAttributes(
        editor.state.selection.$from.parent.type.name,
        { indent }
      );
    };

    return {
      Tab: insertTabStop,
      'Shift-Tab': reduceListLevel,
      Backspace: removeBlockIndent,
      Enter: keepBlockIndentOnNewParagraph,
    };
  },
});
