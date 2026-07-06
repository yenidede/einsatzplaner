import { useMemo } from 'react';
import { Search } from 'lucide-react';
import type { DocumentTemplateFieldDefinition } from '@/features/document-template/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DOCUMENT_FIELD_DRAG_MIME } from '../utils/documentTemplateEditorConstants';

const fieldTypeLabels: Record<
  DocumentTemplateFieldDefinition['dataType'],
  string
> = {
  text: 'Text',
  number: 'Zahl',
  date: 'Datum',
  time: 'Uhrzeit',
  currency: 'Betrag',
  boolean: 'Ja/Nein',
  select: 'Auswahl',
  multi_select: 'Mehrfach',
  person: 'Person',
  list: 'Liste',
  email: 'E-Mail',
  phone: 'Telefon',
  rich_text: 'Rich Text',
};

function FieldChip({
  field,
  onInsert,
}: {
  field: DocumentTemplateFieldDefinition;
  onInsert: (field: DocumentTemplateFieldDefinition) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          draggable
          className="bg-secondary/70 text-secondary-foreground hover:bg-secondary flex cursor-grab items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-normal"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData(DOCUMENT_FIELD_DRAG_MIME, field.key);
          }}
          onClick={() => onInsert(field)}
        >
          <span>{field.label}</span>
          <Badge
            variant="outline"
            className="text-muted-foreground h-4 border-transparent px-1 text-[9px]"
          >
            {fieldTypeLabels[field.dataType]}
          </Badge>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <div className="grid gap-1">
          <p className="font-medium">{field.label}</p>
          <p>{field.description}</p>
          <p className="text-xs opacity-80">
            Typ: {fieldTypeLabels[field.dataType]}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function DocumentTemplateFieldLibrary({
  fields,
  groupLabels,
  query,
  onQueryChange,
  onInsert,
}: {
  fields: DocumentTemplateFieldDefinition[];
  groupLabels: Record<DocumentTemplateFieldDefinition['group'], string>;
  query: string;
  onQueryChange: (value: string) => void;
  onInsert: (field: DocumentTemplateFieldDefinition) => void;
}) {
  const filteredFields = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('de-AT');
    return fields.filter((field) => {
      if (field.availableInLibrary === false) return false;
      if (!normalizedQuery) return true;

      const searchableText = [
        field.label,
        field.description,
        field.key,
        fieldTypeLabels[field.dataType],
        groupLabels[field.group],
      ]
        .join(' ')
        .toLocaleLowerCase('de-AT');

      return searchableText.includes(normalizedQuery);
    });
  }, [fields, groupLabels, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Feld suchen..."
          className="pl-9"
          aria-label="Dynamische Felder suchen"
        />
      </div>
      {Object.entries(groupLabels).map(([group, label]) => {
        const groupFields = filteredFields.filter(
          (field) => field.group === group
        );
        if (groupFields.length === 0) return null;

        return (
          <details
            key={group}
            open={group !== 'custom' || Boolean(query.trim())}
          >
            <summary className="text-muted-foreground cursor-pointer text-xs font-medium">
              {label} ({groupFields.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {groupFields.map((field) => (
                <FieldChip key={field.key} field={field} onInsert={onInsert} />
              ))}
            </div>
          </details>
        );
      })}
      {filteredFields.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          Keine passenden dynamischen Felder gefunden.
        </p>
      ) : null}
    </div>
  );
}
