'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
  type RefObject,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  ActiveOverlay,
  buildAnchorViewportRect,
  CanvasSchemaHotspot,
  ELEMENT_OVERLAY_MAX_WIDTH_PX,
  ELEMENT_OVERLAY_MIN_HEIGHT_PX,
  ELEMENT_OVERLAY_MIN_WIDTH_PX,
  FloatingOverlayRect,
  FOOTER_OVERLAY_MAX_WIDTH_PX,
  FOOTER_OVERLAY_MIN_HEIGHT_PX,
  FOOTER_OVERLAY_MIN_WIDTH_PX,
  getDefaultOverlayLayout,
  intersectsViewport,
  OverlayAnchor,
  OverlayPanelLayout,
  OverlayPlacementMode,
  OVERLAY_ANCHOR_GAP_PX,
  OVERLAY_VIEWPORT_MARGIN_PX,
  PDF_PAGE_HEIGHT_MM,
} from '@/features/pdf-template/lib/pdf-template-editor-utils';
import type { PdfTemplateFooterConfig } from '@/features/pdf-template/types';

interface UsePdfTemplateOverlayOptions {
  editorCanvasRef: RefObject<HTMLDivElement | null>;
  footerZoneRef: RefObject<HTMLDivElement | null>;
  activeOverlay: ActiveOverlay;
  setActiveOverlay: Dispatch<SetStateAction<ActiveOverlay>>;
  selectedElementKey: string | null;
  selectedElementPageIndex: number | null;
  canvasSchemaHotspots: CanvasSchemaHotspot[];
  currentPageIndex: number;
  footerConfig: PdfTemplateFooterConfig | null;
  setFooterConfig: Dispatch<SetStateAction<PdfTemplateFooterConfig | null>>;
  footerInteractiveZoneStyle: CSSProperties | null;
}

interface UsePdfTemplateOverlayResult {
  closeActiveOverlay: () => void;
  lastOverlayTriggerRef: MutableRefObject<HTMLElement | null>;
  overlayPanelRef: RefObject<HTMLDivElement | null>;
  overlayViewportStyle: CSSProperties | null;
  startFooterZoneDrag: (clientY: number) => void;
  startOverlayInteraction: (
    kind: 'move' | 'resize',
    clientX: number,
    clientY: number
  ) => void;
}

export function usePdfTemplateOverlay({
  editorCanvasRef,
  footerZoneRef,
  activeOverlay,
  setActiveOverlay,
  selectedElementKey,
  selectedElementPageIndex,
  canvasSchemaHotspots,
  currentPageIndex,
  footerConfig,
  setFooterConfig,
  footerInteractiveZoneStyle,
}: UsePdfTemplateOverlayOptions): UsePdfTemplateOverlayResult {
  const overlayPanelRef = useRef<HTMLDivElement | null>(null);
  const lastOverlayTriggerRef = useRef<HTMLElement | null>(null);
  const overlayLayoutsRef = useRef<
    Record<Exclude<ActiveOverlay, null>, OverlayPanelLayout>
  >({
    element: getDefaultOverlayLayout('element'),
    footer: getDefaultOverlayLayout('footer'),
  });
  const overlayInteractionFrameRef = useRef<number | null>(null);
  const liveOverlayRectRef = useRef<FloatingOverlayRect | null>(null);
  const footerZoneDragFrameRef = useRef<number | null>(null);
  const liveFooterZoneOffsetRef = useRef(0);

  const [overlayAnchor, setOverlayAnchor] = useState<OverlayAnchor | null>(
    null
  );
  const [overlayViewportStyle, setOverlayViewportStyle] =
    useState<CSSProperties | null>(null);
  const [overlayLayouts, setOverlayLayouts] = useState<
    Record<Exclude<ActiveOverlay, null>, OverlayPanelLayout>
  >({
    element: getDefaultOverlayLayout('element'),
    footer: getDefaultOverlayLayout('footer'),
  });

  useEffect(() => {
    overlayLayoutsRef.current = overlayLayouts;
  }, [overlayLayouts]);

  const closeActiveOverlay = useCallback(() => {
    setActiveOverlay(null);
    setOverlayAnchor(null);
    liveOverlayRectRef.current = null;

    if (overlayInteractionFrameRef.current !== null) {
      window.cancelAnimationFrame(overlayInteractionFrameRef.current);
      overlayInteractionFrameRef.current = null;
    }

    window.setTimeout(() => {
      lastOverlayTriggerRef.current?.focus();
    }, 0);
  }, [setActiveOverlay]);

  const updateOverlayViewportPosition = useCallback(() => {
    if (!activeOverlay || !overlayAnchor || !editorCanvasRef.current) {
      setOverlayViewportStyle(null);
      return;
    }

    const anchorRect = buildAnchorViewportRect(
      editorCanvasRef.current,
      overlayAnchor
    );
    const canvasRect = editorCanvasRef.current.getBoundingClientRect();

    if (
      !intersectsViewport(anchorRect, OVERLAY_VIEWPORT_MARGIN_PX) ||
      anchorRect.right < canvasRect.left ||
      anchorRect.left > canvasRect.right ||
      anchorRect.bottom < canvasRect.top ||
      anchorRect.top > canvasRect.bottom
    ) {
      setOverlayViewportStyle(null);
      setActiveOverlay(null);
      setOverlayAnchor(null);
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const savedLayout = overlayLayoutsRef.current[activeOverlay];
    const minWidth =
      activeOverlay === 'footer'
        ? FOOTER_OVERLAY_MIN_WIDTH_PX
        : ELEMENT_OVERLAY_MIN_WIDTH_PX;
    const maxWidthLimit =
      activeOverlay === 'footer'
        ? FOOTER_OVERLAY_MAX_WIDTH_PX
        : ELEMENT_OVERLAY_MAX_WIDTH_PX;
    const minHeight =
      activeOverlay === 'footer'
        ? FOOTER_OVERLAY_MIN_HEIGHT_PX
        : ELEMENT_OVERLAY_MIN_HEIGHT_PX;
    const preferredWidth =
      activeOverlay === 'footer'
        ? Math.min(
            Math.max(viewportWidth * 0.42, 560),
            FOOTER_OVERLAY_MAX_WIDTH_PX
          )
        : Math.min(
            Math.max(viewportWidth * 0.28, 320),
            ELEMENT_OVERLAY_MAX_WIDTH_PX
          );
    const defaultLayout = getDefaultOverlayLayout(activeOverlay);
    const width = Math.min(
      Math.max(
        savedLayout.rect.width === defaultLayout.rect.width
          ? preferredWidth
          : savedLayout.rect.width,
        minWidth
      ),
      Math.min(maxWidthLimit, viewportWidth - OVERLAY_VIEWPORT_MARGIN_PX * 2)
    );
    const maxHeight = Math.min(
      Math.max(
        savedLayout.rect.maxHeight === defaultLayout.rect.maxHeight
          ? Math.min(viewportHeight * 0.8, defaultLayout.rect.maxHeight)
          : savedLayout.rect.maxHeight,
        minHeight
      ),
      viewportHeight - OVERLAY_VIEWPORT_MARGIN_PX * 2
    );
    const measuredHeight = Math.min(
      overlayPanelRef.current?.offsetHeight ??
        (activeOverlay === 'footer' ? maxHeight : Math.max(360, minHeight)),
      maxHeight
    );

    let left = savedLayout.rect.left;
    let top = savedLayout.rect.top;

    if (savedLayout.mode === 'anchored') {
      left = anchorRect.right + OVERLAY_ANCHOR_GAP_PX;

      if (left + width > viewportWidth - OVERLAY_VIEWPORT_MARGIN_PX) {
        left = anchorRect.left - width - OVERLAY_ANCHOR_GAP_PX;
      }

      if (left < OVERLAY_VIEWPORT_MARGIN_PX) {
        left = Math.max(
          OVERLAY_VIEWPORT_MARGIN_PX,
          Math.min(
            anchorRect.left,
            viewportWidth - width - OVERLAY_VIEWPORT_MARGIN_PX
          )
        );
      }

      const preferredTop =
        activeOverlay === 'footer'
          ? anchorRect.top
          : anchorRect.top + anchorRect.height / 2 - measuredHeight / 2;

      top = Math.max(
        OVERLAY_VIEWPORT_MARGIN_PX,
        Math.min(
          preferredTop,
          viewportHeight - measuredHeight - OVERLAY_VIEWPORT_MARGIN_PX
        )
      );
    } else {
      left = Math.max(
        OVERLAY_VIEWPORT_MARGIN_PX,
        Math.min(left, viewportWidth - width - OVERLAY_VIEWPORT_MARGIN_PX)
      );
      top = Math.max(
        OVERLAY_VIEWPORT_MARGIN_PX,
        Math.min(
          top,
          viewportHeight - measuredHeight - OVERLAY_VIEWPORT_MARGIN_PX
        )
      );
    }

    setOverlayViewportStyle({
      position: 'fixed',
      top,
      left,
      width,
      maxHeight,
      zIndex: 80,
    });
  }, [activeOverlay, editorCanvasRef, overlayAnchor, setActiveOverlay]);

  useEffect(() => {
    if (activeOverlay === 'element') {
      if (!selectedElementKey || selectedElementPageIndex !== currentPageIndex) {
        setActiveOverlay(null);
        setOverlayAnchor(null);
        return;
      }

      const hotspot = canvasSchemaHotspots.find(
        (item) => item.key === selectedElementKey
      );

      if (!hotspot) {
        setActiveOverlay(null);
        setOverlayAnchor(null);
        return;
      }

      setOverlayAnchor({
        pageIndex: hotspot.pageIndex,
        x: hotspot.x,
        y: hotspot.y,
        width: hotspot.width,
        height: hotspot.height,
      });
      return;
    }

    if (activeOverlay === 'footer') {
      if (
        !footerConfig?.enabled ||
        footerConfig.pageIndex !== currentPageIndex ||
        !footerInteractiveZoneStyle
      ) {
        setActiveOverlay(null);
        setOverlayAnchor(null);
        return;
      }

      const left =
        typeof footerInteractiveZoneStyle.left === 'number'
          ? footerInteractiveZoneStyle.left
          : null;
      const top =
        typeof footerInteractiveZoneStyle.top === 'number'
          ? footerInteractiveZoneStyle.top
          : null;
      const width =
        typeof footerInteractiveZoneStyle.width === 'number'
          ? footerInteractiveZoneStyle.width
          : null;
      const height =
        typeof footerInteractiveZoneStyle.height === 'number'
          ? footerInteractiveZoneStyle.height
          : null;

      if (left === null || top === null || width === null || height === null) {
        setActiveOverlay(null);
        setOverlayAnchor(null);
        return;
      }

      setOverlayAnchor({
        pageIndex: currentPageIndex,
        x: left,
        y: top,
        width,
        height,
      });
      return;
    }

    setOverlayAnchor(null);
  }, [
    activeOverlay,
    canvasSchemaHotspots,
    currentPageIndex,
    footerConfig,
    footerInteractiveZoneStyle,
    selectedElementKey,
    selectedElementPageIndex,
    setActiveOverlay,
  ]);

  useLayoutEffect(() => {
    if (!activeOverlay) {
      setOverlayViewportStyle(null);
      return;
    }

    updateOverlayViewportPosition();

    const handleViewportChange = () => {
      window.requestAnimationFrame(updateOverlayViewportPosition);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    const canvasElement = editorCanvasRef.current;
    const overlayElement = overlayPanelRef.current;
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => handleViewportChange())
        : null;

    if (canvasElement && resizeObserver) {
      resizeObserver.observe(canvasElement);
    }

    if (overlayElement && resizeObserver) {
      resizeObserver.observe(overlayElement);
    }

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.visualViewport?.removeEventListener(
        'resize',
        handleViewportChange
      );
      window.visualViewport?.removeEventListener(
        'scroll',
        handleViewportChange
      );
      resizeObserver?.disconnect();
    };
  }, [activeOverlay, editorCanvasRef, updateOverlayViewportPosition]);

  const applyOverlayRectToDom = useCallback((rect: FloatingOverlayRect) => {
    if (!overlayPanelRef.current) {
      return;
    }

    overlayPanelRef.current.style.top = `${rect.top}px`;
    overlayPanelRef.current.style.left = `${rect.left}px`;
    overlayPanelRef.current.style.width = `${rect.width}px`;
    overlayPanelRef.current.style.maxHeight = `${rect.maxHeight}px`;
  }, []);

  const commitOverlayLayout = useCallback(
    (
      overlay: Exclude<ActiveOverlay, null>,
      rect: FloatingOverlayRect,
      nextMode?: OverlayPlacementMode
    ) => {
      setOverlayLayouts((current) => ({
        ...current,
        [overlay]: {
          mode: nextMode ?? current[overlay].mode,
          rect,
        },
      }));
    },
    []
  );

  const startOverlayInteraction = useCallback(
    (kind: 'move' | 'resize', clientX: number, clientY: number) => {
      if (!overlayViewportStyle || !activeOverlay) {
        return;
      }

      const overlayKind = activeOverlay;
      const startRect: FloatingOverlayRect = {
        top:
          typeof overlayViewportStyle.top === 'number'
            ? overlayViewportStyle.top
            : 0,
        left:
          typeof overlayViewportStyle.left === 'number'
            ? overlayViewportStyle.left
            : 0,
        width:
          typeof overlayViewportStyle.width === 'number'
            ? overlayViewportStyle.width
            : overlayLayoutsRef.current[overlayKind].rect.width,
        maxHeight:
          typeof overlayViewportStyle.maxHeight === 'number'
            ? overlayViewportStyle.maxHeight
            : overlayLayoutsRef.current[overlayKind].rect.maxHeight,
      };
      const minWidth =
        overlayKind === 'footer'
          ? FOOTER_OVERLAY_MIN_WIDTH_PX
          : ELEMENT_OVERLAY_MIN_WIDTH_PX;
      const maxWidth =
        overlayKind === 'footer'
          ? FOOTER_OVERLAY_MAX_WIDTH_PX
          : ELEMENT_OVERLAY_MAX_WIDTH_PX;
      const minHeight =
        overlayKind === 'footer'
          ? FOOTER_OVERLAY_MIN_HEIGHT_PX
          : ELEMENT_OVERLAY_MIN_HEIGHT_PX;
      const startMode = overlayLayoutsRef.current[overlayKind].mode;
      const deltaX = clientX - startRect.left;
      const deltaY = clientY - startRect.top;

      function scheduleDomUpdate(nextRect: FloatingOverlayRect) {
        liveOverlayRectRef.current = nextRect;

        if (overlayInteractionFrameRef.current !== null) {
          return;
        }

        overlayInteractionFrameRef.current = window.requestAnimationFrame(
          () => {
            overlayInteractionFrameRef.current = null;
            if (liveOverlayRectRef.current) {
              applyOverlayRectToDom(liveOverlayRectRef.current);
            }
          }
        );
      }

      function handlePointerMove(event: PointerEvent) {
        let nextRect = startRect;

        if (kind === 'move') {
          nextRect = {
            ...startRect,
            left: Math.max(
              OVERLAY_VIEWPORT_MARGIN_PX,
              Math.min(
                event.clientX - deltaX,
                window.innerWidth - startRect.width - OVERLAY_VIEWPORT_MARGIN_PX
              )
            ),
            top: Math.max(
              OVERLAY_VIEWPORT_MARGIN_PX,
              Math.min(
                event.clientY - deltaY,
                window.innerHeight -
                  startRect.maxHeight -
                  OVERLAY_VIEWPORT_MARGIN_PX
              )
            ),
          };
        } else {
          nextRect = {
            ...startRect,
            width: Math.max(
              minWidth,
              Math.min(
                startRect.width + (event.clientX - clientX),
                Math.min(
                  maxWidth,
                  window.innerWidth -
                    startRect.left -
                    OVERLAY_VIEWPORT_MARGIN_PX
                )
              )
            ),
            maxHeight: Math.max(
              minHeight,
              Math.min(
                startRect.maxHeight + (event.clientY - clientY),
                window.innerHeight - startRect.top - OVERLAY_VIEWPORT_MARGIN_PX
              )
            ),
          };
        }

        scheduleDomUpdate(nextRect);
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (overlayInteractionFrameRef.current !== null) {
          window.cancelAnimationFrame(overlayInteractionFrameRef.current);
          overlayInteractionFrameRef.current = null;
        }

        const finalRect = liveOverlayRectRef.current ?? startRect;
        liveOverlayRectRef.current = null;
        commitOverlayLayout(
          overlayKind,
          finalRect,
          kind === 'move' ? 'manual' : startMode
        );
        setOverlayViewportStyle((current) =>
          current
            ? {
                ...current,
                top: finalRect.top,
                left: finalRect.left,
                width: finalRect.width,
                maxHeight: finalRect.maxHeight,
              }
            : current
        );
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }

      document.body.style.userSelect = 'none';
      document.body.style.cursor = kind === 'move' ? 'grabbing' : 'nwse-resize';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [activeOverlay, applyOverlayRectToDom, commitOverlayLayout, overlayViewportStyle]
  );

  const startFooterZoneDrag = useCallback(
    (clientY: number) => {
      const activeFooterConfig = footerConfig;

      if (
        !activeFooterConfig ||
        !footerInteractiveZoneStyle ||
        !footerZoneRef.current
      ) {
        return;
      }

      const overlayHeight =
        typeof footerInteractiveZoneStyle.height === 'number'
          ? footerInteractiveZoneStyle.height
          : null;

      if (!overlayHeight || overlayHeight <= 0) {
        return;
      }

      const footerToDrag: PdfTemplateFooterConfig = activeFooterConfig;
      const normalizedOverlayHeight = overlayHeight;
      const startTopSpacing = footerToDrag.topSpacing;

      function scheduleZoneOffset(nextOffset: number) {
        liveFooterZoneOffsetRef.current = nextOffset;

        if (footerZoneDragFrameRef.current !== null) {
          return;
        }

        footerZoneDragFrameRef.current = window.requestAnimationFrame(() => {
          footerZoneDragFrameRef.current = null;
          if (footerZoneRef.current) {
            footerZoneRef.current.style.transform = `translateY(${liveFooterZoneOffsetRef.current}px)`;
          }
        });
      }

      function handlePointerMove(event: PointerEvent) {
        scheduleZoneOffset(event.clientY - clientY);
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);

        if (footerZoneDragFrameRef.current !== null) {
          window.cancelAnimationFrame(footerZoneDragFrameRef.current);
          footerZoneDragFrameRef.current = null;
        }

        const deltaPixels = liveFooterZoneOffsetRef.current;
        liveFooterZoneOffsetRef.current = 0;

        if (footerZoneRef.current) {
          footerZoneRef.current.style.transform = '';
        }

        const deltaMm =
          (deltaPixels / normalizedOverlayHeight) * PDF_PAGE_HEIGHT_MM;
        const nextTopSpacing = Math.max(
          0,
          Math.min(24, startTopSpacing - deltaMm)
        );

        if (nextTopSpacing !== footerToDrag.topSpacing) {
          setFooterConfig({
            ...footerToDrag,
            topSpacing: Number(nextTopSpacing.toFixed(2)),
          });
        }

        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }

      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ns-resize';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [footerConfig, footerInteractiveZoneStyle, footerZoneRef, setFooterConfig]
  );

  useEffect(() => {
    if (!activeOverlay) {
      return;
    }

    overlayPanelRef.current?.focus();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (
        overlayPanelRef.current?.contains(target) ||
        target.closest('[data-overlay-trigger="true"]') ||
        target.closest('[data-slot="select-content"]') ||
        target.closest('[data-slot="select-item"]') ||
        target.closest('[data-slot="select-trigger"]') ||
        target.closest('[data-radix-popper-content-wrapper]')
      ) {
        return;
      }

      closeActiveOverlay();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeActiveOverlay();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeOverlay, closeActiveOverlay]);

  useEffect(() => {
    return () => {
      if (overlayInteractionFrameRef.current !== null) {
        window.cancelAnimationFrame(overlayInteractionFrameRef.current);
      }

      if (footerZoneDragFrameRef.current !== null) {
        window.cancelAnimationFrame(footerZoneDragFrameRef.current);
      }

      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  return {
    closeActiveOverlay,
    lastOverlayTriggerRef,
    overlayPanelRef,
    overlayViewportStyle,
    startFooterZoneDrag,
    startOverlayInteraction,
  };
}
