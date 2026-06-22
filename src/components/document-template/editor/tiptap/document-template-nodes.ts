import { Extension, isNodeSelection, mergeAttributes, Node } from '@tiptap/core';

function spacingStyleFromAttributes(
  attributes: Record<string, unknown>
): string | undefined {
  const styles = [
    typeof attributes.spacingTop === 'number'
      ? `margin-top: ${attributes.spacingTop}px`
      : null,
    typeof attributes.spacingBottom === 'number'
      ? `margin-bottom: ${attributes.spacingBottom}px`
      : null,
    typeof attributes.indent === 'number'
      ? `margin-left: ${attributes.indent}px`
      : null,
  ].filter((style): style is string => Boolean(style));

  return styles.length > 0 ? styles.join('; ') : undefined;
}

export const DocumentBlockStyleExtension = Extension.create({
  name: 'documentBlockStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'infoBox'],
        attributes: {
          spacingTop: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute('data-spacing-top');
              return value ? Number(value) : null;
            },
            renderHTML: (attributes) => ({
              'data-spacing-top': attributes.spacingTop,
              style: spacingStyleFromAttributes(attributes),
            }),
          },
          spacingBottom: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute('data-spacing-bottom');
              return value ? Number(value) : null;
            },
            renderHTML: (attributes) => ({
              'data-spacing-bottom': attributes.spacingBottom,
              style: spacingStyleFromAttributes(attributes),
            }),
          },
          indent: {
            default: 0,
            parseHTML: (element) => {
              const value = element.getAttribute('data-indent');
              return value ? Number(value) : 0;
            },
            renderHTML: (attributes) => ({
              'data-indent': attributes.indent,
              style: spacingStyleFromAttributes(attributes),
            }),
          },
        },
      },
    ];
  },
});

export const DynamicFieldNode = Node.create({
  name: 'dynamicField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      fieldKey: { default: '' },
      label: { default: 'Dynamisches Feld' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-dynamic-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const fieldKey =
      typeof HTMLAttributes.fieldKey === 'string'
        ? HTMLAttributes.fieldKey
        : '';
    const label =
      typeof HTMLAttributes.label === 'string'
        ? HTMLAttributes.label
        : 'Dynamisches Feld';

    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-dynamic-field': fieldKey,
        contenteditable: 'false',
        class: 'document-field-chip',
        role: 'button',
        'aria-label': `Dynamisches Feld ${label}`,
      }),
      label,
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      const updateDom = () => {
        const fieldKey =
          typeof node.attrs.fieldKey === 'string' ? node.attrs.fieldKey : '';
        const label =
          typeof node.attrs.label === 'string'
            ? node.attrs.label
            : 'Dynamisches Feld';

        dom.className = 'document-field-chip';
        dom.dataset.dynamicField = fieldKey;
        dom.contentEditable = 'false';
        dom.draggable = false;
        dom.textContent = label;
        dom.setAttribute('role', 'button');
        dom.setAttribute('aria-label', `Dynamisches Feld ${label}`);
      };
      const selectNode = () => {
        const position = typeof getPos === 'function' ? getPos() : undefined;
        if (typeof position !== 'number') return;

        editor.commands.setNodeSelection(position);
        editor.view.focus();
      };
      const handleMouseDown = (event: MouseEvent) => {
        event.preventDefault();
        selectNode();
      };

      updateDom();
      dom.addEventListener('mousedown', handleMouseDown);
      dom.addEventListener('contextmenu', selectNode);

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type.name !== node.type.name) return false;
          node = updatedNode;
          updateDom();
          return true;
        },
        destroy: () => {
          dom.removeEventListener('mousedown', handleMouseDown);
          dom.removeEventListener('contextmenu', selectNode);
        },
      };
    };
  },

  addKeyboardShortcuts() {
    const deleteSelectedDynamicField = () => {
      const { selection } = this.editor.state;
      if (
        isNodeSelection(selection) &&
        selection.node.type.name === this.name
      ) {
        return this.editor.commands.deleteSelection();
      }

      return false;
    };

    return {
      Backspace: deleteSelectedDynamicField,
      Delete: deleteSelectedDynamicField,
    };
  },
});

export const InfoBoxNode = Node.create({
  name: 'infoBox',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'section[data-document-info-box]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-document-info-box': 'true',
        class: 'document-info-box',
      }),
      0,
    ];
  },
});

export const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-document-page-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-document-page-break': 'true',
        class: 'document-page-break',
      }),
      'Seitenumbruch',
    ];
  },
});
