'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  COLLAPSED_PANEL_WIDTH,
  getDockedEditorMinWidth,
  MIN_LEFT_PANEL_WIDTH,
  MIN_RIGHT_PANEL_WIDTH,
  RESIZE_HANDLE_WIDTH,
} from '@/features/pdf-template/lib/pdf-template-editor-utils';

interface UsePdfTemplateDockLayoutOptions {
  isFieldSidebarOpen: boolean;
  isPreviewOpen: boolean;
  layoutViewportRef: RefObject<HTMLDivElement | null>;
}

interface UsePdfTemplateDockLayoutResult {
  currentLeftWidth: number;
  currentRightWidth: number;
  leftHandleWidth: number;
  rightHandleWidth: number;
  startResize: (side: 'left' | 'right', clientX: number) => void;
}

export function usePdfTemplateDockLayout({
  isFieldSidebarOpen,
  isPreviewOpen,
  layoutViewportRef,
}: UsePdfTemplateDockLayoutOptions): UsePdfTemplateDockLayoutResult {
  const [leftPanelWidth, setLeftPanelWidth] = useState(296);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const cleanupResizeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupResizeRef.current?.();
      cleanupResizeRef.current = null;
    };
  }, []);

  const startResize = useCallback(
    (side: 'left' | 'right', clientX: number) => {
      cleanupResizeRef.current?.();
      const initialX = clientX;
      const initialLeftWidth = leftPanelWidth;
      const initialRightWidth = rightPanelWidth;
      const availableWidth =
        layoutViewportRef.current?.clientWidth ?? window.innerWidth;
      const minEditorWidth = getDockedEditorMinWidth(availableWidth);
      const leftHandleWidth = isFieldSidebarOpen ? RESIZE_HANDLE_WIDTH : 0;
      const rightHandleWidth = isPreviewOpen ? RESIZE_HANDLE_WIDTH : 0;
      const maxLeftWidth = Math.max(
        MIN_LEFT_PANEL_WIDTH,
        availableWidth -
          initialRightWidth -
          leftHandleWidth -
          rightHandleWidth -
          minEditorWidth
      );
      const maxRightWidth = Math.max(
        MIN_RIGHT_PANEL_WIDTH,
        availableWidth -
          initialLeftWidth -
          leftHandleWidth -
          rightHandleWidth -
          minEditorWidth
      );

      function handlePointerMove(event: PointerEvent) {
        const delta = event.clientX - initialX;

        if (side === 'left') {
          const nextWidth = Math.min(
            maxLeftWidth,
            Math.max(MIN_LEFT_PANEL_WIDTH, initialLeftWidth + delta)
          );
          setLeftPanelWidth(nextWidth);
          return;
        }

        const nextWidth = Math.min(
          maxRightWidth,
          Math.max(MIN_RIGHT_PANEL_WIDTH, initialRightWidth - delta)
        );
        setRightPanelWidth(nextWidth);
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        cleanupResizeRef.current = null;
      }

      cleanupResizeRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [
      isFieldSidebarOpen,
      isPreviewOpen,
      layoutViewportRef,
      leftPanelWidth,
      rightPanelWidth,
    ]
  );

  return {
    currentLeftWidth: isFieldSidebarOpen
      ? leftPanelWidth
      : COLLAPSED_PANEL_WIDTH,
    currentRightWidth: isPreviewOpen
      ? rightPanelWidth
      : COLLAPSED_PANEL_WIDTH,
    leftHandleWidth: isFieldSidebarOpen ? RESIZE_HANDLE_WIDTH : 0,
    rightHandleWidth: isPreviewOpen ? RESIZE_HANDLE_WIDTH : 0,
    startResize,
  };
}
