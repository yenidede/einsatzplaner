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
type ImageFrame = ImageSize & {
  x: number;
  y: number;
};
type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const RESIZE_DIRECTIONS: ResizeDirection[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

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

function resizeDirection(value: string | undefined): ResizeDirection | null {
  return RESIZE_DIRECTIONS.find((direction) => direction === value) ?? null;
}

export function calculateResizedImageFrame({
  direction,
  deltaX,
  deltaY,
  preserveAspectRatio,
  originFrame,
  bounds,
}: {
  direction: ResizeDirection;
  deltaX: number;
  deltaY: number;
  preserveAspectRatio: boolean;
  originFrame: ImageFrame;
  bounds: ImageSize;
}): ImageFrame {
  const changesLeft = direction.includes('w');
  const changesRight = direction.includes('e');
  const changesTop = direction.includes('n');
  const changesBottom = direction.includes('s');
  const changesWidth = changesLeft || changesRight;
  const changesHeight = changesTop || changesBottom;
  const maxWidth = changesLeft
    ? originFrame.x + originFrame.width
    : bounds.width - originFrame.x;
  const maxHeight = changesTop
    ? originFrame.y + originFrame.height
    : bounds.height - originFrame.y;
  let width = changesWidth
    ? originFrame.width + (changesLeft ? -deltaX : deltaX)
    : originFrame.width;
  let height = changesHeight
    ? originFrame.height + (changesTop ? -deltaY : deltaY)
    : originFrame.height;

  if (preserveAspectRatio) {
    const widthScale = width / originFrame.width;
    const heightScale = height / originFrame.height;
    const requestedScale = !changesHeight
      ? widthScale
      : !changesWidth
        ? heightScale
        : Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
          ? widthScale
          : heightScale;
    const minimumScale = Math.max(
      MIN_IMAGE_WIDTH / originFrame.width,
      MIN_IMAGE_HEIGHT / originFrame.height
    );
    const maximumScale = Math.min(
      maxWidth / originFrame.width,
      maxHeight / originFrame.height
    );
    const scale = clamp(requestedScale, minimumScale, maximumScale);
    width = originFrame.width * scale;
    height = originFrame.height * scale;
  } else {
    width = clamp(width, MIN_IMAGE_WIDTH, maxWidth);
    height = clamp(height, MIN_IMAGE_HEIGHT, maxHeight);
  }

  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);

  return {
    width: roundedWidth,
    height: roundedHeight,
    x: changesLeft
      ? Math.round(originFrame.x + originFrame.width - roundedWidth)
      : originFrame.x,
    y: changesTop
      ? Math.round(originFrame.y + originFrame.height - roundedHeight)
      : originFrame.y,
  };
}

function imageLayoutMetrics(wrapper: HTMLElement): ImageLayoutMetrics | null {
  const editorElement = wrapper.closest('.ProseMirror');
  if (!(editorElement instanceof HTMLElement)) return null;

  const bounds = editorElement.getBoundingClientRect();
  const scale =
    editorElement.offsetWidth > 0
      ? bounds.width / editorElement.offsetWidth
      : 1;
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
      const resizeHandles = RESIZE_DIRECTIONS.map((direction) => {
        const handle = document.createElement('span');
        handle.className = 'document-template-image-resize-handle';
        handle.dataset.resizeDirection = direction;
        handle.setAttribute('aria-label', `Bildgröße ${direction} ändern`);
        handle.setAttribute('role', 'button');
        handle.setAttribute('title', 'Bildgröße ziehen');
        return handle;
      });
      let imageIsSelected = false;
      let imageIsHovered = false;
      let imageIsResizing = false;

      const selectImageNode = () => {
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

      const updateResizeHandleVisibility = () => {
        const visible = imageIsSelected || imageIsHovered || imageIsResizing;
        resizeHandles.forEach((handle) => {
          handle.style.opacity = visible ? '1' : '0';
          handle.style.pointerEvents = visible ? 'auto' : 'none';
        });
      };

      const applyVisualFrame = (frame: ImageFrame) => {
        if (imageMode(currentNode.attrs.mode) === 'free') {
          wrapper.style.left = `${frame.x}px`;
          wrapper.style.top = `${frame.y}px`;
          wrapper.style.width = `${frame.width}px`;
          wrapper.style.height = `${frame.height}px`;
        }

        content.style.width = `${frame.width}px`;
        content.style.height = `${frame.height}px`;
        image.style.width = `${frame.width}px`;
        image.style.height = `${frame.height}px`;
        placeholder.style.width = `${frame.width}px`;
        placeholder.style.minHeight = `${Math.min(frame.height, 80)}px`;
      };

      const ensureResizeHandles = () => {
        resizeHandles.forEach((handle) => {
          if (!handle.parentElement) content.append(handle);
        });
        updateResizeHandleVisibility();
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
        applyVisualFrame({ width, height, x, y });

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
          ensureResizeHandles();
          return;
        }

        image.className = 'document-template-image';
        image.src = src;
        image.alt = typeof attrs.alt === 'string' ? attrs.alt : 'Bild';
        image.draggable = false;
        image.style.objectFit = 'contain';
        placeholder.remove();
        if (!image.parentElement) content.append(image);
        ensureResizeHandles();
      };

      const handlePointerDown = (event: PointerEvent) => {
        selectImageNode();

        if (
          event.target instanceof HTMLElement &&
          resizeDirection(event.target.dataset.resizeDirection)
        ) {
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

      const handleResizePointerDown = (event: PointerEvent) => {
        if (!(event.target instanceof HTMLElement)) return;
        const direction = resizeDirection(event.target.dataset.resizeDirection);
        if (!direction) return;

        event.preventDefault();
        event.stopPropagation();
        selectImageNode();

        const metrics = imageLayoutMetrics(wrapper);
        if (!metrics) return;

        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startY = event.clientY;
        const mode = imageMode(currentNode.attrs.mode);
        const originFrame = {
          width: numberAttr(currentNode.attrs.width, 160),
          height: numberAttr(currentNode.attrs.height, 80),
          x: numberAttr(currentNode.attrs.x, 0),
          y: numberAttr(currentNode.attrs.y, 0),
        };
        const bounds = {
          width: metrics.logicalWidth,
          height: metrics.logicalHeight,
        };
        const inlineOriginFrame = {
          ...originFrame,
          x: direction.includes('w')
            ? metrics.logicalWidth - originFrame.width
            : 0,
          y: direction.includes('n')
            ? metrics.logicalHeight - originFrame.height
            : 0,
        };
        const resizeHandle = event.target;

        const resizedFrame = (pointerEvent: PointerEvent) =>
          calculateResizedImageFrame({
            direction,
            deltaX: (pointerEvent.clientX - startX) / metrics.safeScale,
            deltaY: (pointerEvent.clientY - startY) / metrics.safeScale,
            preserveAspectRatio: pointerEvent.shiftKey,
            originFrame: mode === 'free' ? originFrame : inlineOriginFrame,
            bounds,
          });

        imageIsResizing = true;
        content.dataset.resizing = 'true';
        updateResizeHandleVisibility();
        resizeHandle.setPointerCapture(pointerId);

        const handlePointerMove = (moveEvent: PointerEvent) => {
          applyVisualFrame(resizedFrame(moveEvent));
        };

        const stopResize = (upEvent: PointerEvent) => {
          if (resizeHandle.hasPointerCapture(pointerId)) {
            resizeHandle.releasePointerCapture(pointerId);
          }
          resizeHandle.removeEventListener('pointermove', handlePointerMove);
          resizeHandle.removeEventListener('pointerup', stopResize);
          resizeHandle.removeEventListener('pointercancel', stopResize);
          delete content.dataset.resizing;
          imageIsResizing = false;
          updateResizeHandleVisibility();

          const nextFrame = resizedFrame(upEvent);
          updateNodeAttrs(
            mode === 'free'
              ? nextFrame
              : { width: nextFrame.width, height: nextFrame.height }
          );
        };

        resizeHandle.addEventListener('pointermove', handlePointerMove);
        resizeHandle.addEventListener('pointerup', stopResize);
        resizeHandle.addEventListener('pointercancel', stopResize);
      };

      const handlePointerEnter = () => {
        imageIsHovered = true;
        updateResizeHandleVisibility();
      };

      const handlePointerLeave = () => {
        imageIsHovered = false;
        updateResizeHandleVisibility();
      };

      wrapper.append(content);
      updateDom();
      wrapper.addEventListener('pointerdown', handlePointerDown);
      wrapper.addEventListener('pointerenter', handlePointerEnter);
      wrapper.addEventListener('pointerleave', handlePointerLeave);
      wrapper.addEventListener('contextmenu', selectImageNode);
      content.addEventListener('pointerdown', handleResizePointerDown);

      return {
        dom: wrapper,
        selectNode: () => {
          imageIsSelected = true;
          wrapper.classList.add('ProseMirror-selectednode');
          updateResizeHandleVisibility();
        },
        deselectNode: () => {
          imageIsSelected = false;
          wrapper.classList.remove('ProseMirror-selectednode');
          updateResizeHandleVisibility();
        },
        update: (updatedNode) => {
          if (updatedNode.type.name !== currentNode.type.name) return false;
          currentNode = updatedNode;
          updateDom();
          return true;
        },
        destroy: () => {
          wrapper.removeEventListener('pointerdown', handlePointerDown);
          wrapper.removeEventListener('pointerenter', handlePointerEnter);
          wrapper.removeEventListener('pointerleave', handlePointerLeave);
          wrapper.removeEventListener('contextmenu', selectImageNode);
          content.removeEventListener('pointerdown', handleResizePointerDown);
        },
      };
    };
  },
});
