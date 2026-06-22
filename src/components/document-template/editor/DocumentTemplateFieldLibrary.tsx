import { Search } from 'lucide-react';
import type { DocumentTemplateFieldDefinition } from '@/features/document-template/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const documentFieldDragMime = 'application/document-template-field';

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
  const filteredFields = fields.filter((field) =>
    `${field.label} ${field.description} ${field.key}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Dynamische Felder suchen"
          className="pl-9"
        />
      </div>
      {Object.entries(groupLabels).map(([group, label]) => {
        const groupFields = filteredFields.filter(
          (field) => field.group === group
        );
        if (groupFields.length === 0) return null;

        return (
          <div key={group} className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <div className="flex flex-wrap gap-2">
              {groupFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  draggable
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex cursor-grab items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-normal"
                  title={field.description}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'copy';
                    event.dataTransfer.setData(documentFieldDragMime, field.key);
                  }}
                  onClick={() => onInsert(field)}
                >
                  <span>{field.label}</span>
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                    {fieldTypeLabels[field.dataType]}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
