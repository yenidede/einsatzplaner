'use client';

import { useMemo, useState, type DragEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  LayoutTemplate,
  Minus,
  MoveHorizontal,
  Plus,
  Rows3,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFooterColumn,
  PdfTemplateFooterConfig,
  PdfTemplateFooterLayout,
  PdfTemplateFooterRow,
  PdfTemplateFooterSeparator,
} from '@/features/pdf-template/types';
import { cn } from '@/lib/utils';

export interface PdfTemplateFooterTarget {
  rowId: string | null;
  column: PdfTemplateFooterColumn;
}

interface PdfTemplateFooterBuilderProps {
  footer: PdfTemplateFooterConfig;
  fields: PdfTemplateFieldDefinition[];
  currentPageIndex: number;
  activeTarget: PdfTemplateFooterTarget;
  canAddRow: boolean;
  onSelectTarget: (target: PdfTemplateFooterTarget) => void;
  onClose: () => void;
  onDisableFooter: () => void;
  onUpdateFooter: (footer: PdfTemplateFooterConfig) => void;
  onMoveStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

const LAYOUT_OPTIONS: Array<{ value: PdfTemplateFooterLayout; label: string }> = [
  { value: 'single_column', label: 'Eine Spalte' },
  { value: 'two_column', label: 'Zwei Spalten' },
  { value: 'contact_line', label: 'Kontaktzeile' },
];

const LAYOUT_HINTS: Record<PdfTemplateFooterLayout, string> = {
  single_column: 'Alle Zeilen laufen untereinander über die gesamte Footer-Breite.',
  two_column: 'Zeilen können links oder rechts angeordnet und zwischen beiden Spalten verschoben werden.',
  contact_line:
    'Alle Inhalte stehen in einer einzigen Kontaktzeile und werden mit einem Trennzeichen verbunden.',
};

const SEPARATOR_OPTIONS: Array<{
  value: PdfTemplateFooterSeparator;
  label: string;
}> = [
  { value: 'pipe', label: '|' },
  { value: 'dot', label: 'Punkt' },
  { value: 'dash', label: '-' },
  { value: 'slash', label: '/' },
];

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createSegment(text = '{organisation_name}') {
  return { id: randomId('segment'), text };
}

function createRow(column: PdfTemplateFooterColumn = 'left'): PdfTemplateFooterRow {
  return {
    id: randomId('row'),
    column,
    separator: 'pipe',
    segments: [createSegment()],
  };
}

function normalizeRowsForLayout(
  rows: PdfTemplateFooterRow[],
  layout: PdfTemplateFooterLayout
): PdfTemplateFooterRow[] {
  if (layout === 'contact_line') {
    return [
      {
        id: rows[0]?.id ?? randomId('row'),
        column: 'left',
        separator: rows[0]?.separator ?? 'pipe',
        segments: rows.flatMap((row) => row.segments).length
          ? rows.flatMap((row) => row.segments)
          : [createSegment()],
      },
    ];
  }

  if (layout === 'single_column') {
    return rows.map((row) => ({ ...row, column: 'left' }));
  }

  return rows.length > 0 ? rows : [createRow('left')];
}

function getTargetRow(
  footer: PdfTemplateFooterConfig,
  target: PdfTemplateFooterTarget
): PdfTemplateFooterRow | null {
  if (target.rowId) {
    const exact = footer.rows.find(
      (row) => row.id === target.rowId && row.column === target.column
    );

    if (exact) {
      return exact;
    }
  }

  if (footer.layout === 'two_column') {
    return footer.rows.find((row) => row.column === target.column) ?? footer.rows[0] ?? null;
  }

  return footer.rows[0] ?? null;
}

function FooterToken({
  text,
  onChange,
  onRemove,
}: {
  text: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex min-w-0 max-w-full items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-[0_4px_10px_rgba(15,23,42,0.04)]">
      <Input
        value={text}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 min-w-0 border-0 px-0 text-xs shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-md text-slate-500"
        onClick={onRemove}
        aria-label="Segment entfernen"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function StageColumn({
  title,
  description,
  active,
  onClick,
  onDragOver,
  onDrop,
  children,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'min-w-0 rounded-[0.9rem] border px-3 py-2.5 transition-colors',
        active
          ? 'border-sky-500 bg-sky-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
        {title}
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}

function ColumnRowCard({
  row,
  index,
  title,
  active,
  onSelect,
  onMoveUp,
  onMoveDown,
  onMoveToOtherColumn,
  onRemoveRow,
  onAddTextSegment,
  onUpdateSeparator,
  onUpdateSegment,
  onRemoveSegment,
  onDragStart,
}: {
  row: PdfTemplateFooterRow;
  index: number;
  title: string;
  active: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToOtherColumn: () => void;
  onRemoveRow: () => void;
  onAddTextSegment: () => void;
  onUpdateSeparator: (value: PdfTemplateFooterSeparator) => void;
  onUpdateSegment: (segmentId: string, value: string) => void;
  onRemoveSegment: (segmentId: string) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={cn(
        'min-w-0 rounded-[0.9rem] border px-3 py-2.5',
        active ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="flex min-w-0 items-center gap-2 text-left" onClick={onSelect}>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-950">{title}</div>
            <div className="text-[11px] text-slate-500">Position {index + 1}</div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={onMoveUp} aria-label="Zeile nach oben">
            ↑
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={onMoveDown} aria-label="Zeile nach unten">
            ↓
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={onMoveToOtherColumn} aria-label="Zeile in die andere Spalte verschieben">
            <MoveHorizontal className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={onRemoveRow} aria-label="Zeile entfernen">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-8 rounded-xl px-2.5 text-xs" onClick={onAddTextSegment}>
          <Plus className="h-3.5 w-3.5" />
          Textsegment
        </Button>

        <Select value={row.separator} onValueChange={onUpdateSeparator}>
          <SelectTrigger className="h-8 w-[8.5rem] rounded-xl bg-white text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEPARATOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3 flex min-w-0 flex-wrap gap-1.5 overflow-hidden">
        {row.segments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
            Leer
          </div>
        ) : (
          row.segments.map((segment) => (
            <FooterToken
              key={segment.id}
              text={segment.text}
              onChange={(value) => onUpdateSegment(segment.id, value)}
              onRemove={() => onRemoveSegment(segment.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function PdfTemplateFooterBuilder({
  footer,
  fields,
  currentPageIndex,
  activeTarget,
  canAddRow,
  onSelectTarget,
  onClose,
  onDisableFooter,
  onUpdateFooter,
  onMoveStart,
  onResizeStart,
}: PdfTemplateFooterBuilderProps) {
  const [fieldToInsert, setFieldToInsert] = useState('');
  const activeRow = getTargetRow(footer, activeTarget);
  const leftRows = useMemo(() => footer.rows.filter((row) => row.column === 'left'), [footer.rows]);
  const rightRows = useMemo(() => footer.rows.filter((row) => row.column === 'right'), [footer.rows]);

  const selectedLabel = useMemo(() => {
    if (!activeRow) {
      return footer.layout === 'two_column'
        ? `Spalte ${activeTarget.column === 'left' ? 'links' : 'rechts'}`
        : 'Keine Zielzeile';
    }

    const rowIndex = footer.rows.findIndex((row) => row.id === activeRow.id);
    const columnLabel =
      footer.layout === 'two_column'
        ? activeTarget.column === 'left'
          ? 'links'
          : 'rechts'
        : 'voll';

    return `Zeile ${rowIndex + 1}, Bereich ${columnLabel}`;
  }, [activeRow, activeTarget.column, footer.layout, footer.rows]);
  const selectedTargetLabel = useMemo(() => {
    if (!activeRow) {
      return 'Kein Bereich ausgewählt';
    }

    if (footer.layout === 'contact_line') {
      return 'Kontaktzeile über die gesamte Breite';
    }

    if (footer.layout === 'two_column') {
      return `Zeile ${footer.rows.findIndex((row) => row.id === activeRow.id) + 1} in der ${activeTarget.column === 'left' ? 'linken' : 'rechten'} Spalte`;
    }

    return `Zeile ${footer.rows.findIndex((row) => row.id === activeRow.id) + 1} über die gesamte Breite`;
  }, [activeRow, activeTarget.column, footer.layout, footer.rows]);

  function updateRows(nextRows: PdfTemplateFooterRow[]) {
    onUpdateFooter({
      ...footer,
      rows: nextRows,
    });
  }

  function updateRow(
    rowId: string,
    updater: (row: PdfTemplateFooterRow) => PdfTemplateFooterRow
  ) {
    updateRows(footer.rows.map((row) => (row.id === rowId ? updater(row) : row)));
  }

  function updateLayout(layout: PdfTemplateFooterLayout) {
    const nextRows = normalizeRowsForLayout(footer.rows, layout);
    const fallbackRow = nextRows[0] ?? null;

    onUpdateFooter({
      ...footer,
      layout,
      rows: nextRows,
    });

    if (fallbackRow) {
      onSelectTarget({
        rowId: fallbackRow.id,
        column: layout === 'two_column' ? fallbackRow.column : 'left',
      });
    }
  }

  function addRow(columnOverride?: PdfTemplateFooterColumn) {
    const column =
      footer.layout === 'two_column'
        ? columnOverride ?? activeTarget.column
        : 'left';
    const nextRow = createRow(column);
    const nextRows =
      footer.layout === 'contact_line'
        ? [nextRow]
        : [...footer.rows, nextRow];

    updateRows(nextRows);
    onSelectTarget({
      rowId: nextRow.id,
      column,
    });
  }

  function removeRow(rowId: string) {
    const remainingRows = footer.rows.filter((row) => row.id !== rowId);
    const nextRows = remainingRows.length > 0 ? remainingRows : [createRow('left')];
    const nextActiveRow =
      nextRows.find((row) => row.column === activeTarget.column) ?? nextRows[0];

    updateRows(nextRows);
    onSelectTarget({
      rowId: nextActiveRow.id,
      column: footer.layout === 'two_column' ? nextActiveRow.column : 'left',
    });
  }

  function moveRowWithinColumn(rowId: string, direction: -1 | 1) {
    const sourceRow = footer.rows.find((row) => row.id === rowId);

    if (!sourceRow) {
      return;
    }

    const columnRows = footer.rows.filter((row) => row.column === sourceRow.column);
    const indexInColumn = columnRows.findIndex((row) => row.id === rowId);
    const targetIndexInColumn = indexInColumn + direction;

    if (targetIndexInColumn < 0 || targetIndexInColumn >= columnRows.length) {
      return;
    }

    const targetRow = columnRows[targetIndexInColumn];
    const nextRows = [...footer.rows];
    const sourceIndex = nextRows.findIndex((row) => row.id === rowId);
    const destinationIndex = nextRows.findIndex((row) => row.id === targetRow.id);
    const current = nextRows[sourceIndex];
    nextRows[sourceIndex] = nextRows[destinationIndex];
    nextRows[destinationIndex] = current;
    updateRows(nextRows);
  }

  function moveRowToColumn(rowId: string, column: PdfTemplateFooterColumn) {
    updateRows(
      footer.rows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              column,
            }
          : row
      )
    );

    onSelectTarget({
      rowId,
      column,
    });
  }

  function addTextSegment(rowId: string) {
    updateRow(rowId, (row) => ({
      ...row,
      segments: [...row.segments, createSegment('Text')],
    }));
  }

  function updateSegment(rowId: string, segmentId: string, value: string) {
    updateRow(rowId, (row) => ({
      ...row,
      segments: row.segments.map((segment) =>
        segment.id === segmentId ? { ...segment, text: value } : segment
      ),
    }));
  }

  function removeSegment(rowId: string, segmentId: string) {
    updateRow(rowId, (row) => ({
      ...row,
      segments:
        row.segments.length > 1
          ? row.segments.filter((segment) => segment.id !== segmentId)
          : [createSegment('')],
    }));
  }

  function insertSelectedField() {
    if (!fieldToInsert) {
      return;
    }

    const targetRowId =
      activeRow?.id ??
      (footer.layout === 'two_column'
        ? footer.rows.find((row) => row.column === activeTarget.column)?.id ?? null
        : footer.rows[0]?.id ?? null);

    if (!targetRowId) {
      addRow(footer.layout === 'two_column' ? activeTarget.column : 'left');
      return;
    }

    updateRow(targetRowId, (row) => ({
      ...row,
      column: footer.layout === 'two_column' ? activeTarget.column : row.column,
      segments: [...row.segments, createSegment(`{${fieldToInsert}}`)],
    }));
  }

  function handleRowDragStart(
    event: DragEvent<HTMLDivElement>,
    rowId: string,
    column: PdfTemplateFooterColumn
  ) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'application/pdf-template-footer-row',
      JSON.stringify({ rowId, column })
    );
  }

  function handleColumnDrop(
    event: DragEvent<HTMLDivElement>,
    column: PdfTemplateFooterColumn
  ) {
    event.preventDefault();
    const payload = event.dataTransfer.getData('application/pdf-template-footer-row');

    if (!payload) {
      return;
    }

    try {
      const parsed = JSON.parse(payload) as {
        rowId: string;
        column: PdfTemplateFooterColumn;
      };
      moveRowToColumn(parsed.rowId, column);
    } catch {
      return;
    }
  }

  function renderSingleColumnRows(rows: PdfTemplateFooterRow[]) {
    return rows.map((row, rowIndex) => (
      <div
        key={row.id}
        className={cn(
          'rounded-[1rem] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]',
          activeRow?.id === row.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-left"
            onClick={() => onSelectTarget({ rowId: row.id, column: 'left' })}
          >
            <div className="text-sm font-semibold text-slate-950">Zeile {rowIndex + 1}</div>
          </button>

          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={() => moveRowWithinColumn(row.id, -1)} aria-label="Zeile nach oben">
              ↑
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={() => moveRowWithinColumn(row.id, 1)} aria-label="Zeile nach unten">
              ↓
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-500" onClick={() => removeRow(row.id)} aria-label="Zeile entfernen">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="h-8 rounded-xl px-2.5 text-xs" onClick={() => addTextSegment(row.id)}>
            <Plus className="h-3.5 w-3.5" />
            Textsegment
          </Button>
          <Select value={row.separator} onValueChange={(value: PdfTemplateFooterSeparator) => updateRow(row.id, (current) => ({ ...current, separator: value }))}>
            <SelectTrigger className="h-8 w-[8.5rem] rounded-xl bg-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEPARATOR_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {row.segments.map((segment) => (
            <FooterToken
              key={segment.id}
              text={segment.text}
              onChange={(value) => updateSegment(row.id, segment.id, value)}
              onRemove={() => removeSegment(row.id, segment.id)}
            />
          ))}
        </div>
      </div>
    ));
  }

  return (
    <div
      className="relative flex min-w-0 flex-col overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-[0_28px_60px_rgba(15,23,42,0.22)]"
      style={{
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: '80vh',
      }}
    >
      <div
        className="sticky top-0 z-10 flex cursor-move flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-5"
        onPointerDown={onMoveStart}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-semibold text-slate-950">Footer-Builder</h3>
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px]">
                Seite {currentPageIndex + 1}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              Bearbeiten Sie den Footer für die aktuelle Seite.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl px-4"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onDisableFooter}
          >
            Footer aus
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            aria-label="Overlay schließen"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-3 md:p-4">
        <div className="space-y-3">
          <div className="rounded-[0.95rem] border border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                  <Rows3 className="h-4 w-4" />
                  Aktiver Bearbeitungsbereich
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950">{selectedLabel}</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Wählen Sie das Layout und fügen Sie Inhalte in den markierten Bereich ein.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="grid gap-1.5">
                <Label className="text-[11px] text-slate-600">Footer-Layout</Label>
                <Select value={footer.layout} onValueChange={updateLayout}>
                  <SelectTrigger className="h-10 w-full rounded-xl bg-white text-left text-sm [&>span]:block [&>span]:w-full [&>span]:truncate [&>span]:text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-slate-500">{LAYOUT_HINTS[footer.layout]}</p>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-[11px] text-slate-600">Abstand unten</Label>
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={footer.topSpacing}
                    onChange={(event) =>
                      onUpdateFooter({
                        ...footer,
                        topSpacing: Number(event.target.value) || 0,
                      })
                    }
                    className="h-10 rounded-xl bg-white text-sm"
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    0 setzt den Footer maximal tief.
                  </p>
                </div>

                <Button type="button" variant="outline" className="h-10 w-full rounded-xl px-3 text-sm" onClick={() => addRow(footer.layout === 'two_column' ? activeTarget.column : 'left')} disabled={!canAddRow}>
                  <Plus className="h-4 w-4" />
                  Zeile hinzufügen
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-1.5 border-t border-slate-100 pt-4">
              <Label className="text-[11px] text-slate-600">Inhalte in den markierten Bereich einfügen</Label>
              <p className="text-xs leading-5 text-slate-500">
                Aktuell ausgewählt: {selectedTargetLabel}.
              </p>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Select value={fieldToInsert} onValueChange={setFieldToInsert}>
                  <SelectTrigger className="h-10 w-full min-w-0 rounded-xl bg-white text-left text-sm sm:min-w-[16rem] [&>span]:block [&>span]:w-full [&>span]:truncate [&>span]:text-left">
                    <SelectValue placeholder="Feld für den markierten Bereich auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field) => (
                      <SelectItem key={field.key} value={field.key}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button type="button" className="h-10 rounded-xl px-4" onClick={insertSelectedField} disabled={!fieldToInsert}>
                  <Plus className="h-4 w-4" />
                  Ausgewähltes Feld einfügen
                </Button>
              </div>
            </div>
          </div>

          {footer.layout === 'two_column' ? (
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              <StageColumn
                title="Linke Spalte"
                description="Zeilen hierhin ziehen oder direkt links anlegen."
                active={activeTarget.column === 'left'}
                onClick={() =>
                  onSelectTarget({
                    rowId: leftRows[0]?.id ?? activeTarget.rowId,
                    column: 'left',
                  })
                }
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => handleColumnDrop(event, 'left')}
              >
                <Button type="button" variant="outline" className="h-9 w-full rounded-xl text-sm" onClick={() => addRow('left')}>
                  <Plus className="h-4 w-4" />
                  Zeile links anlegen
                </Button>

                {leftRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-sm text-slate-500">
                    Leer. Ziehen Sie eine Zeile hierher oder legen Sie eine neue an.
                  </div>
                ) : (
                  leftRows.map((row, index) => (
                    <ColumnRowCard
                      key={row.id}
                      row={row}
                      index={index}
                      title="Links"
                      active={activeTarget.column === 'left' && activeTarget.rowId === row.id}
                      onSelect={() => onSelectTarget({ rowId: row.id, column: 'left' })}
                      onMoveUp={() => moveRowWithinColumn(row.id, -1)}
                      onMoveDown={() => moveRowWithinColumn(row.id, 1)}
                      onMoveToOtherColumn={() => moveRowToColumn(row.id, 'right')}
                      onRemoveRow={() => removeRow(row.id)}
                      onAddTextSegment={() => addTextSegment(row.id)}
                      onUpdateSeparator={(value) =>
                        updateRow(row.id, (current) => ({ ...current, separator: value }))
                      }
                      onUpdateSegment={(segmentId, value) =>
                        updateSegment(row.id, segmentId, value)
                      }
                      onRemoveSegment={(segmentId) => removeSegment(row.id, segmentId)}
                      onDragStart={(event) => handleRowDragStart(event, row.id, 'left')}
                    />
                  ))
                )}
              </StageColumn>

              <StageColumn
                title="Rechte Spalte"
                description="Zeilen hierhin ziehen oder direkt rechts anlegen."
                active={activeTarget.column === 'right'}
                onClick={() =>
                  onSelectTarget({
                    rowId: rightRows[0]?.id ?? activeTarget.rowId,
                    column: 'right',
                  })
                }
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(event) => handleColumnDrop(event, 'right')}
              >
                <Button type="button" variant="outline" className="h-9 w-full rounded-xl text-sm" onClick={() => addRow('right')}>
                  <Plus className="h-4 w-4" />
                  Zeile rechts anlegen
                </Button>

                {rightRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-sm text-slate-500">
                    Leer. Ziehen Sie eine Zeile hierher oder legen Sie eine neue an.
                  </div>
                ) : (
                  rightRows.map((row, index) => (
                    <ColumnRowCard
                      key={row.id}
                      row={row}
                      index={index}
                      title="Rechts"
                      active={activeTarget.column === 'right' && activeTarget.rowId === row.id}
                      onSelect={() => onSelectTarget({ rowId: row.id, column: 'right' })}
                      onMoveUp={() => moveRowWithinColumn(row.id, -1)}
                      onMoveDown={() => moveRowWithinColumn(row.id, 1)}
                      onMoveToOtherColumn={() => moveRowToColumn(row.id, 'left')}
                      onRemoveRow={() => removeRow(row.id)}
                      onAddTextSegment={() => addTextSegment(row.id)}
                      onUpdateSeparator={(value) =>
                        updateRow(row.id, (current) => ({ ...current, separator: value }))
                      }
                      onUpdateSegment={(segmentId, value) =>
                        updateSegment(row.id, segmentId, value)
                      }
                      onRemoveSegment={(segmentId) => removeSegment(row.id, segmentId)}
                      onDragStart={(event) => handleRowDragStart(event, row.id, 'right')}
                    />
                  ))
                )}
              </StageColumn>
            </div>
          ) : (
            <div className="space-y-2.5">{renderSingleColumnRows(footer.rows)}</div>
          )}
        </div>
      </div>

      <div
        className="absolute right-2 bottom-2 h-5 w-5 cursor-se-resize rounded-md border border-slate-200 bg-white/90 shadow-sm"
        onPointerDown={onResizeStart}
        aria-hidden="true"
      />
    </div>
  );
}

export { PdfTemplateFooterBuilder as PdfTemplateFooterInlineEditor };
