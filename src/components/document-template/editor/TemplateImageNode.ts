import { Node, mergeAttributes } from '@tiptap/core';

type ImageMode = 'inline' | 'free';
type ImageAlign = 'left' | 'center' | 'right';
type ImageLayoutMetrics = {
  safeScale: number;
  logicalWidth: number;
  logicalHeight: number;
};
type ImageSize = {
  width: number;
  height: number;
};

const MIN_IMAGE_WIDTH = 24;
const MIN_IMAGE_HEIGHT = 16;

function imageMode(value: unknown): ImageMode {
  return value === 'free' ? 'free' : 'inline';
}

function imageAlign(value: unknown): ImageAlign {
  if (value === 'center' || value === 'right') return value;
  return 'left';
}

function numberAttr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function imageLayoutMetrics(wrapper: HTMLElement): ImageLayoutMetrics | null {
  const editorElement = wrapper.closest('.ProseMirror');
  if (!(editorElement instanceof HTMLElement)) return null;

  const bounds = editorElement.getBoundingClientRect();
  const scale =
    editorElement.offsetWidth > 0 ? bounds.width / editorElement.offsetWidth : 1;
  const safeScale = scale > 0 ? scale : 1;

  return {
    safeScale,
    logicalWidth: bounds.width / safeScale,
    logicalHeight: bounds.height / safeScale,
  };
}

function renderImageStyle(attributes: Record<string, unknown>): string {
  const mode = imageMode(attributes.mode);
  const width = numberAttr(attributes.width, 160);
  const height = numberAttr(attributes.height, 80);

  if (mode === 'free') {
    const x = numberAttr(attributes.x, 0);
    const y = numberAttr(attributes.y, 0);
    return [
      `left: ${x}px`,
      `top: ${y}px`,
      `width: ${width}px`,
      `height: ${height}px`,
      'object-fit: contain',
      'position: absolute',
    ].join('; ');
  }

  return `width: ${width}px; height: ${height}px; object-fit: contain;`;
}

export const TemplateImageNode = Node.create({
  name: 'templateImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: 'Bild' },
      width: { default: 160 },
      height: { default: 80 },
      align: { default: 'left' },
      keepAspectRatio: { default: true },
      mode: { default: 'inline' },
      x: { default: 0 },
      y: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'img[data-template-image]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        'data-template-image': 'true',
        'data-image-mode': imageMode(HTMLAttributes.mode),
        src: HTMLAttributes.src,
        alt: HTMLAttributes.alt,
        class: `document-template-image document-template-image-${imageAlign(
          HTMLAttributes.align
        )}`,
        style: renderImageStyle(HTMLAttributes),
      }),
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node;
      const wrapper = document.createElement('div');
      const content = document.createElement('div');
      const image = document.createElement('img');
      const placeholder = document.createElement('span');
      const resizeHandle = document.createElement('span');

      const selectNode = () => {
        const position = typeof getPos === 'function' ? getPos() : undefined;
        if (typeof position !== 'number') return;

        editor.commands.setNodeSelection(position);
        editor.view.focus();
      };

      const updateNodeAttrs = (
        attrs: Record<string, string | number | boolean>
      ) => {
        const position = typeof getPos === 'function' ? getPos() : undefined;
        if (typeof position !== 'number') return;

        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeMarkup(position, undefined, {
              ...currentNode.attrs,
              ...attrs,
            });
            return true;
          })
          .run();
      };

      const applyVisualSize = (width: number, height: number) => {
        if (imageMode(currentNode.attrs.mode) === 'free') {
          wrapper.style.width = `${width}px`;
          wrapper.style.height = `${height}px`;
        }

        content.style.width = `${width}px`;
        content.style.height = `${height}px`;
        image.style.width = `${width}px`;
        image.style.height = `${height}px`;
        placeholder.style.width = `${width}px`;
        placeholder.style.minHeight = `${Math.min(height, 80)}px`;
      };

      const ensureResizeHandle = () => {
        resizeHandle.className = 'document-template-image-resize-handle';
        resizeHandle.setAttribute('aria-hidden', 'true');
        if (!resizeHandle.parentElement) content.append(resizeHandle);
      };

      const updateDom = () => {
        const attrs = currentNode.attrs;
        const align = imageAlign(attrs.align);
        const mode = imageMode(attrs.mode);
        const src = typeof attrs.src === 'string' ? attrs.src : '';
        const width = numberAttr(attrs.width, 160);
        const height = numberAttr(attrs.height, 80);
        const x = numberAttr(attrs.x, 0);
        const y = numberAttr(attrs.y, 0);

        wrapper.className =
          mode === 'free'
            ? 'document-template-image-wrapper document-template-image-wrapper-free'
            : `document-template-image-wrapper document-template-image-wrapper-${align}`;
        wrapper.dataset.imageMode = mode;
        wrapper.dataset.templateImageNode = 'true';
        wrapper.contentEditable = 'false';
        wrapper.style.left = mode === 'free' ? `${x}px` : '';
        wrapper.style.top = mode === 'free' ? `${y}px` : '';
        wrapper.style.width = mode === 'free' ? `${width}px` : '';
        wrapper.style.height = mode === 'free' ? `${height}px` : '';

        content.className = 'document-template-image-content';
        applyVisualSize(width, height);

        if (src.startsWith('{{')) {
          placeholder.className = 'document-template-image-placeholder';
          placeholder.textContent =
            src === '{{organizationLogoUrl}}'
              ? 'Kein Organisationslogo hinterlegt.'
              : typeof attrs.alt === 'string'
                ? attrs.alt
                : 'Bild';
          image.remove();
          if (!placeholder.parentElement) content.append(placeholder);
          ensureResizeHandle();
          return;
        }

        image.className = 'document-template-image';
        image.src = src;
        image.alt = typeof attrs.alt === 'string' ? attrs.alt : 'Bild';
        image.draggable = false;
        image.style.objectFit = 'contain';
        placeholder.remove();
        if (!image.parentElement) content.append(image);
        ensureResizeHandle();
      };

      const handlePointerDown = (event: PointerEvent) => {
        selectNode();

        if (event.target === resizeHandle) {
          return;
        }

        if (imageMode(currentNode.attrs.mode) !== 'free') {
          return;
        }

        event.preventDefault();
        const metrics = imageLayoutMetrics(wrapper);
        if (!metrics) return;

        const startX = event.clientX;
        const startY = event.clientY;
        const originX = numberAttr(currentNode.attrs.x, 0);
        const originY = numberAttr(currentNode.attrs.y, 0);
        const width = numberAttr(currentNode.attrs.width, 160);
        const height = numberAttr(currentNode.attrs.height, 80);
        const pointerId = event.pointerId;

        wrapper.setPointerCapture(pointerId);

        const handlePointerMove = (moveEvent: PointerEvent) => {
          const nextX = clamp(
            originX + (moveEvent.clientX - startX) / metrics.safeScale,
            0,
            Math.max(0, metrics.logicalWidth - width)
          );
          const nextY = clamp(
            originY + (moveEvent.clientY - startY) / metrics.safeScale,
            0,
            Math.max(0, metrics.logicalHeight - height)
          );

          wrapper.style.left = `${nextX}px`;
          wrapper.style.top = `${nextY}px`;
        };

        const stopDrag = (upEvent: PointerEvent) => {
          wrapper.releasePointerCapture(pointerId);
          wrapper.removeEventListener('pointermove', handlePointerMove);
          wrapper.removeEventListener('pointerup', stopDrag);
          wrapper.removeEventListener('pointercancel', stopDrag);

          const nextX = clamp(
            originX + (upEvent.clientX - startX) / metrics.safeScale,
            0,
            Math.max(0, metrics.logicalWidth - width)
          );
          const nextY = clamp(
            originY + (upEvent.clientY - startY) / metrics.safeScale,
            0,
            Math.max(0, metrics.logicalHeight - height)
          );

          updateNodeAttrs({
            x: Math.round(nextX),
            y: Math.round(nextY),
          });
        };

        wrapper.addEventListener('pointermove', handlePointerMove);
        wrapper.addEventListener('pointerup', stopDrag);
        wrapper.addEventListener('pointercancel', stopDrag);
      };

      const calculateResizedImage = (
        clientX: number,
        clientY: number,
        startX: number,
        startY: number,
        metrics: ImageLayoutMetrics,
        originSize: ImageSize,
        originPosition: { x: number; y: number }
      ): ImageSize => {
        const mode = imageMode(currentNode.attrs.mode);
        const keepAspectRatio = currentNode.attrs.keepAspectRatio !== false;
        const maxWidth =
          mode === 'free'
            ? Math.max(MIN_IMAGE_WIDTH, metrics.logicalWidth - originPosition.x)
            : Math.max(MIN_IMAGE_WIDTH, metrics.logicalWidth);
        const maxHeight =
          mode === 'free'
            ? Math.max(
                MIN_IMAGE_HEIGHT,
                metrics.logicalHeight - originPosition.y
              )
            : Math.max(MIN_IMAGE_HEIGHT, metrics.logicalHeight);
        const deltaX = (clientX - startX) / metrics.safeScale;
        const deltaY = (clientY - startY) / metrics.safeScale;

        if (!keepAspectRatio) {
          return {
            width: Math.round(
              clamp(originSize.width + deltaX, MIN_IMAGE_WIDTH, maxWidth)
            ),
            height: Math.round(
              clamp(originSize.height + deltaY, MIN_IMAGE_HEIGHT, maxHeight)
            ),
          };
        }

        const aspectRatio =
          originSize.width > 0 && originSize.height > 0
            ? originSize.width / originSize.height
            : 1;
        const widthDriven = Math.abs(deltaX) >= Math.abs(deltaY);
        let nextWidth = widthDriven
          ? clamp(originSize.width + deltaX, MIN_IMAGE_WIDTH, maxWidth)
          : clamp(
              (originSize.height + deltaY) * aspectRatio,
              MIN_IMAGE_WIDTH,
              maxWidth
            );
        let nextHeight = nextWidth / aspectRatio;

        if (nextHeight > maxHeight) {
          nextHeight = maxHeight;
          nextWidth = nextHeight * aspectRatio;
        }

        if (nextHeight < MIN_IMAGE_HEIGHT) {
          nextHeight = MIN_IMAGE_HEIGHT;
          nextWidth = nextHeight * aspectRatio;
        }

        return {
          width: Math.round(clamp(nextWidth, MIN_IMAGE_WIDTH, maxWidth)),
          height: Math.round(clamp(nextHeight, MIN_IMAGE_HEIGHT, maxHeight)),
        };
      };

      const handleResizePointerDown = (event: PointerEvent) => {
        event.preventDefault();
        event.stopPropagation();
        selectNode();

        const metrics = imageLayoutMetrics(wrapper);
        if (!metrics) return;

        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startY = event.clientY;
        const originSize = {
          width: numberAttr(currentNode.attrs.width, 160),
          height: numberAttr(currentNode.attrs.height, 80),
        };
        const originPosition = {
          x: numberAttr(currentNode.attrs.x, 0),
          y: numberAttr(currentNode.attrs.y, 0),
        };

        resizeHandle.setPointerCapture(pointerId);

        const handlePointerMove = (moveEvent: PointerEvent) => {
          const nextSize = calculateResizedImage(
            moveEvent.clientX,
            moveEvent.clientY,
            startX,
            startY,
            metrics,
            originSize,
            originPosition
          );

          applyVisualSize(nextSize.width, nextSize.height);
        };

        const stopResize = (upEvent: PointerEvent) => {
          if (resizeHandle.hasPointerCapture(pointerId)) {
            resizeHandle.releasePointerCapture(pointerId);
          }
          resizeHandle.removeEventListener('pointermove', handlePointerMove);
          resizeHandle.removeEventListener('pointerup', stopResize);
          resizeHandle.removeEventListener('pointercancel', stopResize);

          const nextSize = calculateResizedImage(
            upEvent.clientX,
            upEvent.clientY,
            startX,
            startY,
            metrics,
            originSize,
            originPosition
          );

          updateNodeAttrs(nextSize);
        };

        resizeHandle.addEventListener('pointermove', handlePointerMove);
        resizeHandle.addEventListener('pointerup', stopResize);
        resizeHandle.addEventListener('pointercancel', stopResize);
      };

      wrapper.append(content);
      updateDom();
      wrapper.addEventListener('pointerdown', handlePointerDown);
      wrapper.addEventListener('contextmenu', selectNode);
      resizeHandle.addEventListener('pointerdown', handleResizePointerDown);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== currentNode.type.name) return false;
          currentNode = updatedNode;
          updateDom();
          return true;
        },
        destroy: () => {
          wrapper.removeEventListener('pointerdown', handlePointerDown);
          wrapper.removeEventListener('contextmenu', selectNode);
          resizeHandle.removeEventListener(
            'pointerdown',
            handleResizePointerDown
          );
        },
      };
    };
  },
});
