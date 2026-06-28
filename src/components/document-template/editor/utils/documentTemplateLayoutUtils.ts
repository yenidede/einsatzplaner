import {
  DOCUMENT_PAGE_HEIGHT_PX,
  DOCUMENT_PAGE_WIDTH_PX,
} from '@/features/document-template/lib/document-page-geometry';
import type { SidebarResizeSide } from '../types/documentTemplateEditorTypes';

export const A4_EDITOR_WIDTH_PX = DOCUMENT_PAGE_WIDTH_PX;
export const A4_EDITOR_HEIGHT_PX = DOCUMENT_PAGE_HEIGHT_PX;
export const MM_TO_EDITOR_PX = A4_EDITOR_WIDTH_PX / 210;
export const COLLAPSED_SIDEBAR_WIDTH_PX = 48;
export const SIDEBAR_WIDTH = {
  left: { min: 240, default: 300, max: 420 },
  right: { min: 280, default: 340, max: 520 },
};
export const SIDEBAR_STORAGE_KEYS = {
  leftWidth: 'documentTemplateEditor.leftSidebarWidth',
  rightWidth: 'documentTemplateEditor.rightSidebarWidth',
  leftCollapsed: 'documentTemplateEditor.leftSidebarCollapsed',
  rightCollapsed: 'documentTemplateEditor.rightSidebarCollapsed',
};

export function clampSidebarWidth(
  side: SidebarResizeSide,
  value: number
): number {
  const limits = SIDEBAR_WIDTH[side];
  return Math.min(limits.max, Math.max(limits.min, value));
}

export function readStoredNumber(key: string, fallback: number): number {
  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) return fallback;

  const parsedValue = Number(storedValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function readStoredBoolean(key: string, fallback: boolean): boolean {
  const storedValue = window.localStorage.getItem(key);
  if (storedValue === 'true') return true;
  if (storedValue === 'false') return false;
  return fallback;
}

export function mmToPx(value: number): number {
  return Math.round(value * MM_TO_EDITOR_PX);
}
