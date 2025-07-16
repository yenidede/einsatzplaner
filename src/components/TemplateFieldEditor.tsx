import { useState } from 'react';

export interface TemplateField {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'time' | 'group';
  required: boolean;
  multiline?: boolean; // für Text
  multiple?: boolean; // für Auswahl
  placeholder?: string;
  defaultValue?: any;
  minLength?: number;
  maxLength?: number;
  options?: string[];
}

interface Props {
  fields: TemplateField[];
  onChange: (fields: TemplateField[]) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Zahl' },
  { value: 'checkbox', label: 'Ja/Nein (Checkbox)' },
  { value: 'date', label: 'Datum' },
  { value: 'time', label: 'Uhrzeit' },
  { value: 'select', label: 'Auswahl (Dropdown)' },
  { value: 'group', label: 'Feldgruppe (optisch)' },
];

export default function TemplateFieldEditor({ fields, onChange }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newField, setNewField] = useState<TemplateField>({
    id: '',
    label: '',
    name: '',
    type: 'text',
    required: false,
    multiline: false,
    multiple: false,
    placeholder: '',
    defaultValue: '',
    minLength: undefined,
    maxLength: undefined,
    options: [],
  });

  const handleAdd = () => {
    if (!newField.label.trim()) return;
    const name = newField.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    onChange([
      ...fields,
      { ...newField, id: `field_${Date.now()}`, name }
    ]);
    setShowAdd(false);
    setNewField({
      id: '', label: '', name: '', type: 'text', required: false, placeholder: '', defaultValue: '', minLength: undefined, maxLength: undefined, options: []
    });
  };

  const handleRemove = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Eigene Felder</h4>
      <ul className="space-y-2">
        {fields.map(f => (
          <li key={f.id} className="flex items-center space-x-2">
            <span className="font-medium">{f.label}</span>
            <span className="text-xs text-gray-500">({FIELD_TYPES.find(t => t.value === f.type)?.label})</span>
            {f.required && <span className="text-xs text-red-500">Pflichtfeld</span>}
            <button className="ml-2 text-red-500 hover:underline" onClick={() => handleRemove(f.id)}>Entfernen</button>
          </li>
        ))}
      </ul>
      {showAdd ? (
        <div className="p-4 border rounded bg-gray-50 space-y-2">
          <input
            type="text"
            placeholder="Feldname"
            value={newField.label}
            onChange={e => setNewField(f => ({ ...f, label: e.target.value, name: e.target.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') }))}
            className="px-2 py-1 border rounded w-full"
          />
          <select
            value={newField.type}
            onChange={e => setNewField(f => ({ ...f, type: e.target.value as any }))}
            className="px-2 py-1 border rounded w-full"
            title="Feldtyp wählen"
          >
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={newField.required}
              onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))}
            />
            <span>Pflichtfeld</span>
          </label>
          {newField.type === 'text' && (
            <>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newField.multiline || false}
                  onChange={e => setNewField(f => ({ ...f, multiline: e.target.checked }))}
                />
                <span>Mehrzeiliger Text erlauben</span>
              </label>
              <input
                type="text"
                placeholder="Platzhalter"
                value={newField.placeholder}
                onChange={e => setNewField(f => ({ ...f, placeholder: e.target.value }))}
                className="px-2 py-1 border rounded w-full"
              />
              <input
                type="number"
                placeholder="Minimale Länge"
                value={newField.minLength ?? ''}
                onChange={e => setNewField(f => ({ ...f, minLength: e.target.value ? Number(e.target.value) : undefined }))}
                className="px-2 py-1 border rounded w-full"
              />
              <input
                type="number"
                placeholder="Maximale Länge"
                value={newField.maxLength ?? ''}
                onChange={e => setNewField(f => ({ ...f, maxLength: e.target.value ? Number(e.target.value) : undefined }))}
                className="px-2 py-1 border rounded w-full"
              />
            </>
          )}
          {newField.type === 'select' && (
            <>
              <input
                type="text"
                placeholder="Optionen (Komma-getrennt)"
                value={newField.options?.join(',')}
                onChange={e => setNewField(f => ({ ...f, options: e.target.value.split(',').map(o => o.trim()) }))}
                className="px-2 py-1 border rounded w-full"
              />
              <label className="flex items-center space-x-2 mt-1">
                <input
                  type="checkbox"
                  checked={newField.multiple || false}
                  onChange={e => setNewField(f => ({ ...f, multiple: e.target.checked }))}
                />
                <span>Mehrfach-Auswahl möglich</span>
              </label>
            </>
          )}
          {newField.type === 'group' && (
            <div className="text-xs text-gray-500">Feldgruppe: Dient nur der optischen Gruppierung in der Ansicht.</div>
          )}
          <div className="flex space-x-2 mt-2">
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAdd} type="button">Feld speichern</button>
            <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setShowAdd(false)} type="button">Abbrechen</button>
          </div>
        </div>
      ) : (
        <button className="px-3 py-1 bg-blue-50 text-blue-700 rounded" onClick={() => setShowAdd(true)} type="button">+ eigenes Feld hinzufügen</button>
      )}
    </div>
  );
}
