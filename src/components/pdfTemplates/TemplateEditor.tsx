'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PdfTemplateContent,
  PdfBlock,
  PdfBlockType,
} from '@/types/pdfTemplate';
import { updatePdfTemplate } from '@/app/actions/pdfTemplates';
import { VariablePicker } from './VariablePicker';
import { TemplatePreview } from './TemplatePreview';

interface TemplateEditorProps {
  templateId: string;
  initialContent: PdfTemplateContent;
  initialName: string;
}

export function TemplateEditor({
  templateId,
  initialContent,
  initialName,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState<PdfTemplateContent>(
    initialContent || { blocks: [] }
  );
  const [showVariablePicker, setShowVariablePicker] = useState(false);

  const addBlock = (type: PdfBlockType) => {
    const newBlock: PdfBlock = {
      id: `block-${Date.now()}`,
      type,
      data: getDefaultData(type),
    };
    setContent((prev) => ({
      ...prev,
      blocks: [...(prev.blocks || []), newBlock],
    }));
  };

  const getDefaultData = (type: PdfBlockType) => {
    switch (type) {
      case 'text':
        return { content: '' };
      case 'infoTable':
        return { rows: [{ label: '', value: '' }] };
      case 'spacer':
        return { height: 10 };
      case 'signature':
        return { text: '' };
      case 'presetNotice':
        return { notice: '' };
    }
  };

  const updateBlock = (id: string, data: any) => {
    setContent((prev) => ({
      ...prev,
      blocks: (prev.blocks || []).map((b) =>
        b.id === id ? { ...b, data } : b
      ),
    }));
  };

  const removeBlock = (id: string) => {
    setContent((prev) => ({
      ...prev,
      blocks: (prev.blocks || []).filter((b) => b.id !== id),
    }));
  };

  const insertVariable = (variable: string) => {
    // Einfach in den aktuellen Fokus einfügen – für MVP vereinfacht
    navigator.clipboard.writeText(`{{${variable}}}`);
    alert('Variable in Zwischenablage kopiert: {{' + variable + '}}');
  };

  const save = async () => {
    await updatePdfTemplate(templateId, { name, contentJson: content });
    alert('Gespeichert!');
  };

  return (
    <div className="flex space-x-4">
      <div className="w-1/2">
        <h2 className="mb-4 text-xl font-bold">Template bearbeiten</h2>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Template-Name"
          className="mb-4"
        />
        <div className="mb-4">
          <Button onClick={() => setShowVariablePicker(true)}>
            Variable einfügen
          </Button>
        </div>
        <div className="space-y-2">
          {content.blocks?.map((block) => (
            <div key={block.id} className="border p-4">
              <div className="mb-2 flex justify-between">
                <span className="font-bold">{block.type}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeBlock(block.id)}
                >
                  Entfernen
                </Button>
              </div>
              {renderBlockEditor(block, updateBlock)}
            </div>
          ))}
        </div>
        <Select onValueChange={(value) => addBlock(value as PdfBlockType)}>
          <SelectTrigger className="mt-4">
            <SelectValue placeholder="Block hinzufügen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="infoTable">Info-Tabelle</SelectItem>
            <SelectItem value="spacer">Abstand</SelectItem>
            <SelectItem value="signature">Unterschrift</SelectItem>
            <SelectItem value="presetNotice">Vorgegebener Hinweis</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={save} className="mt-4">
          Speichern
        </Button>
      </div>
      <div className="w-1/2">
        <TemplatePreview content={content} />
      </div>
      {showVariablePicker && (
        <VariablePicker
          onSelect={insertVariable}
          onClose={() => setShowVariablePicker(false)}
        />
      )}
    </div>
  );
}

function renderBlockEditor(
  block: PdfBlock,
  onUpdate: (id: string, data: any) => void
) {
  switch (block.type) {
    case 'text':
      return (
        <Textarea
          value={block.data.content}
          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
          placeholder="Text eingeben"
        />
      );
    case 'infoTable':
      return (
        <div>
          {block.data.rows.map((row: any, i: number) => (
            <div key={i} className="mb-2 flex space-x-2">
              <Input
                value={row.label}
                onChange={(e) => {
                  const newRows = [...block.data.rows];
                  newRows[i].label = e.target.value;
                  onUpdate(block.id, { rows: newRows });
                }}
                placeholder="Label"
              />
              <Input
                value={row.value}
                onChange={(e) => {
                  const newRows = [...block.data.rows];
                  newRows[i].value = e.target.value;
                  onUpdate(block.id, { rows: newRows });
                }}
                placeholder="Wert"
              />
            </div>
          ))}
        </div>
      );
    case 'spacer':
      return (
        <Input
          type="number"
          value={block.data.height}
          onChange={(e) =>
            onUpdate(block.id, { height: parseInt(e.target.value) })
          }
          placeholder="Höhe in mm"
        />
      );
    case 'signature':
      return (
        <Textarea
          value={block.data.text}
          onChange={(e) => onUpdate(block.id, { text: e.target.value })}
          placeholder="Unterschrift-Text"
        />
      );
    case 'presetNotice':
      return (
        <Textarea
          value={block.data.notice}
          onChange={(e) => onUpdate(block.id, { notice: e.target.value })}
          placeholder="Hinweis"
        />
      );
  }
}
