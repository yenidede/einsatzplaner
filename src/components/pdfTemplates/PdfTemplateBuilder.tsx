'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import {
  PdfBlock,
  PdfBlockType,
  PdfTemplateContent,
  TextBlock,
  InfoTableBlock,
  SpacerBlock,
  SignatureBlock,
  PresetNoticeBlock,
} from '@/types/pdfTemplate';
import { updatePdfTemplate } from '@/app/actions/pdfTemplates';
import { TemplatePreview } from './TemplatePreview';
import { VariablePicker } from './VariablePicker';
import { Eye, Save, Settings } from 'lucide-react';

interface PdfTemplateBuilderProps {
  templateId: string;
  initialName: string;
  initialContent: PdfTemplateContent;
}

const supportedBlocks: Array<{ type: PdfBlockType; label: string }> = [
  { type: 'text', label: 'Text' },
  { type: 'infoTable', label: 'Info-Tabelle' },
  { type: 'spacer', label: 'Abstand' },
  { type: 'signature', label: 'Unterschrift' },
  { type: 'presetNotice', label: 'Hinweis' },
];

const reusableBlocks: Array<{
  type: PdfBlockType;
  label: string;
  content: any;
}> = [
  {
    type: 'text',
    label: 'Anreise',
    content: { content: 'Bitte pünktlich erscheinen und Ausweis mitbringen.' },
  },
  {
    type: 'text',
    label: 'Kontakt',
    content: { content: 'Bei Fragen: {{organization.email}}' },
  },
  {
    type: 'presetNotice',
    label: 'AGB',
    content: { notice: 'Allgemeine Geschäftsbedingungen gelten.' },
  },
];

const getDefaultData = (type: PdfBlockType) => {
  switch (type) {
    case 'text':
      return { content: 'Neuer Text' };
    case 'infoTable':
      return { rows: [{ label: 'Bezeichnung', value: 'Wert' }] };
    case 'spacer':
      return { height: 10 };
    case 'signature':
      return { text: 'Unterschrift, Name, Rolle' };
    case 'presetNotice':
      return { notice: 'Hinweistext...' };
    default:
      return {};
  }
};

function createBlock(type: PdfBlockType, data?: any): PdfBlock {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    data: data || getDefaultData(type),
  };
}

export function PdfTemplateBuilder({
  templateId,
  initialName,
  initialContent,
}: PdfTemplateBuilderProps) {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState<PdfTemplateContent>(
    initialContent || { blocks: [] }
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const currentBlock = useMemo(
    () => content.blocks.find((block) => block.id === selectedBlockId),
    [content.blocks, selectedBlockId]
  );

  const addBlock = (type: PdfBlockType, data?: any) => {
    const block = createBlock(type, data);
    setContent((prev) => ({
      ...prev,
      blocks: [...(prev.blocks ?? []), block],
    }));
    setSelectedBlockId(block.id);
  };

  const removeBlock = (id: string) => {
    setContent((prev) => ({
      ...prev,
      blocks: (prev.blocks ?? []).filter((block) => block.id !== id),
    }));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const updateBlock = (id: string, data: PdfBlock['data']) => {
    setContent((prev) => ({
      ...prev,
      blocks: (prev.blocks ?? []).map((block) =>
        block.id === id ? { ...block, data } : block
      ),
    }));
  };

  const applyVariable = (variable: string) => {
    if (!currentBlock) return;

    const token = `{{${variable}}}`;

    switch (currentBlock.type) {
      case 'text':
        updateBlock(currentBlock.id, {
          ...(currentBlock.data as TextBlock['data']),
          content: `${(currentBlock.data as TextBlock['data']).content || ''} ${token}`,
        });
        break;
      case 'signature':
        updateBlock(currentBlock.id, {
          ...(currentBlock.data as SignatureBlock['data']),
          text: `${(currentBlock.data as SignatureBlock['data']).text || ''} ${token}`,
        });
        break;
      case 'presetNotice':
        updateBlock(currentBlock.id, {
          ...(currentBlock.data as PresetNoticeBlock['data']),
          notice: `${(currentBlock.data as PresetNoticeBlock['data']).notice || ''} ${token}`,
        });
        break;
      case 'infoTable':
        updateBlock(currentBlock.id, {
          ...(currentBlock.data as InfoTableBlock['data']),
          rows: (currentBlock.data as InfoTableBlock['data']).rows.map(
            (row) => ({
              ...row,
              value: `${row.value || ''} ${token}`,
            })
          ),
        });
        break;
      default:
        break;
    }

    setShowVariablePicker(false);
  };

  const saveTemplate = async () => {
    await updatePdfTemplate(templateId, {
      name,
      contentJson: content,
    });
    alert('Template gespeichert.');
  };

  const onSortingChange = (sortedBlocks: PdfBlock[]) => {
    setContent((prev) => ({ ...prev, blocks: sortedBlocks }));
  };

  if (isPreviewMode) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="sticky top-16 z-40 flex items-center justify-between border-b bg-white p-4 shadow-sm">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-none text-lg font-semibold shadow-none"
          />
          <div className="flex gap-2">
            <Button onClick={() => setIsPreviewMode(false)} variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
            <Button onClick={saveTemplate}>
              <Save className="mr-2 h-4 w-4" />
              Speichern
            </Button>
          </div>
        </div>
        <div className="flex justify-center p-8">
          <TemplatePreview content={content} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Top Bar */}
      <div className="sticky top-16 z-40 flex items-center justify-between border-b bg-white p-4 shadow-sm">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-none text-lg font-semibold shadow-none"
        />
        <div className="flex gap-2">
          <Button onClick={() => setIsPreviewMode(true)} variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Vorschau
          </Button>
          <Button onClick={saveTemplate}>
            <Save className="mr-2 h-4 w-4" />
            Speichern
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 space-y-4 border-r bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Block-Bibliothek
          </h3>
          <div className="space-y-2">
            {supportedBlocks.map((item) => (
              <Button
                key={item.type}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock(item.type)}
              >
                + {item.label}
              </Button>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-semibold text-gray-700">
            Wiederverwendbare Blöcke
          </h3>
          <div className="space-y-2">
            {reusableBlocks.map((item, index) => (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock(item.type, item.content)}
              >
                + {item.label}
              </Button>
            ))}
          </div>
        </aside>

        {/* Main Editor */}
        <main className="flex-1 bg-gray-50 p-8">
          <div className="mx-auto max-w-4xl">
            <div className="min-h-[800px] rounded-lg bg-white p-8 shadow-lg">
              <h1 className="mb-6 text-2xl font-bold">Buchungsbestätigung</h1>

              <Sortable
                value={content.blocks ?? []}
                onValueChange={onSortingChange}
                getItemValue={(item) => item.id}
                orientation="vertical"
              >
                <SortableContent className="space-y-4">
                  {(content.blocks ?? []).map((block, index) => (
                    <div key={block.id}>
                      {/* Insert Area */}
                      <div className="flex h-2 items-center justify-center rounded border-2 border-dashed border-gray-200 opacity-0 transition-opacity hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addBlock('text')}
                        >
                          + Block hinzufügen
                        </Button>
                      </div>

                      <SortableItem value={block.id}>
                        <div
                          className="group relative rounded p-2 transition-colors hover:bg-gray-50"
                          onClick={() => setSelectedBlockId(block.id)}
                        >
                          {/* Hover Toolbar */}
                          <div className="absolute top-0 -left-12 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <SortableItemHandle className="flex h-8 w-8 cursor-move items-center justify-center rounded border bg-white shadow">
                              ⋮⋮
                            </SortableItemHandle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedBlockId(block.id)}
                              className="h-8 w-8 p-0"
                            >
                              ✏️
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeBlock(block.id)}
                              className="h-8 w-8 p-0 text-red-500"
                            >
                              🗑
                            </Button>
                          </div>

                          {/* Block Content */}
                          {renderBlockContent(
                            block,
                            updateBlock,
                            selectedBlockId === block.id
                          )}
                        </div>
                      </SortableItem>
                    </div>
                  ))}

                  {/* Final Insert Area */}
                  <div className="flex h-8 items-center justify-center rounded border-2 border-dashed border-gray-200 opacity-0 transition-opacity hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addBlock('text')}
                    >
                      + Block hinzufügen
                    </Button>
                  </div>
                </SortableContent>
              </Sortable>
            </div>
          </div>
        </main>
      </div>

      {showVariablePicker && (
        <VariablePicker
          onSelect={applyVariable}
          onClose={() => setShowVariablePicker(false)}
        />
      )}
    </div>
  );
}

function renderBlockContent(
  block: PdfBlock,
  onUpdate: (id: string, data: unknown) => void,
  isEditing: boolean
) {
  switch (block.type) {
    case 'text':
      return isEditing ? (
        <Textarea
          value={(block.data as TextBlock['data']).content ?? ''}
          onChange={(e) =>
            onUpdate(block.id, {
              ...(block.data as TextBlock['data']),
              content: e.target.value,
            })
          }
          className="w-full resize-none border-none shadow-none"
          autoFocus
        />
      ) : (
        <p className="leading-relaxed text-gray-800">
          {(block.data as TextBlock['data']).content || 'Neuer Text'}
        </p>
      );
    case 'infoTable':
      return isEditing ? (
        <div className="space-y-2">
          {(block.data as InfoTableBlock['data']).rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-4">
              <Input
                value={row.label}
                onChange={(e) => {
                  const newRows = [
                    ...(block.data as InfoTableBlock['data']).rows,
                  ];
                  newRows[rowIndex] = {
                    ...newRows[rowIndex],
                    label: e.target.value,
                  };
                  onUpdate(block.id, { rows: newRows });
                }}
                placeholder="Label"
                className="w-1/3"
              />
              <Input
                value={row.value}
                onChange={(e) => {
                  const newRows = [
                    ...(block.data as InfoTableBlock['data']).rows,
                  ];
                  newRows[rowIndex] = {
                    ...newRows[rowIndex],
                    value: e.target.value,
                  };
                  onUpdate(block.id, { rows: newRows });
                }}
                placeholder="Wert"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const newRows = [
                    ...(block.data as InfoTableBlock['data']).rows,
                  ];
                  newRows.splice(rowIndex, 1);
                  onUpdate(block.id, { rows: newRows });
                }}
              >
                −
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const newRows = [
                ...(block.data as InfoTableBlock['data']).rows,
                { label: '', value: '' },
              ];
              onUpdate(block.id, { rows: newRows });
            }}
          >
            Zeile hinzufügen
          </Button>
        </div>
      ) : (
        <table className="w-full">
          <tbody>
            {(block.data as InfoTableBlock['data']).rows.map(
              (row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className="pr-4 font-semibold">{row.label}:</td>
                  <td>{row.value}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      );
    case 'spacer':
      return (
        <div
          style={{ height: `${(block.data as SpacerBlock['data']).height}mm` }}
        />
      );
    case 'signature':
      return isEditing ? (
        <Textarea
          value={(block.data as SignatureBlock['data']).text ?? ''}
          onChange={(e) =>
            onUpdate(block.id, {
              ...(block.data as SignatureBlock['data']),
              text: e.target.value,
            })
          }
          className="w-full resize-none border-none shadow-none"
          autoFocus
        />
      ) : (
        <p className="text-gray-600 italic">
          {(block.data as SignatureBlock['data']).text || 'Unterschrift'}
        </p>
      );
    case 'presetNotice':
      return isEditing ? (
        <Textarea
          value={(block.data as PresetNoticeBlock['data']).notice ?? ''}
          onChange={(e) =>
            onUpdate(block.id, {
              ...(block.data as PresetNoticeBlock['data']),
              notice: e.target.value,
            })
          }
          className="w-full resize-none border-none shadow-none"
          autoFocus
        />
      ) : (
        <p className="text-sm text-gray-600">
          {(block.data as PresetNoticeBlock['data']).notice || 'Hinweis'}
        </p>
      );
    default:
      return null;
  }
}
