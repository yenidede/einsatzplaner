'use client';
import { EinsatzTemplate } from '@/features/einsatztemplate/types/einsatzTemplate';
import { useState, useEffect } from 'react';
import TemplateFieldEditor, { TemplateField } from '../../../components/TemplateFieldEditor';

export default function EinsatzTemplateManager() {
  const [templates, setTemplates] = useState<EinsatzTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [customFields, setCustomFields] = useState<TemplateField[]>([]);

  // Standardfelder (fix, nicht editierbar)
  const standardFields: TemplateField[] = [
    { id: 'name', label: 'Name', name: 'name', type: 'text', required: true },
    { id: 'kategorie', label: 'Kategorie (Auswahl)', name: 'kategorie', type: 'select', required: true, options: ['Freizeit', 'Rüstzeuge', 'Sonstiges'] },
    { id: 'gruppe', label: 'Allgemein (Feldgruppe)', name: 'gruppe', type: 'text', required: false },
    { id: 'datum', label: 'Datum', name: 'datum', type: 'text', required: true },
    { id: 'uhrzeitVon', label: 'Uhrzeit von', name: 'uhrzeitVon', type: 'text', required: true },
    { id: 'uhrzeitBis', label: 'Uhrzeit bis', name: 'uhrzeitBis', type: 'text', required: true },
    { id: 'anzahlTeilnehmer', label: 'Anzahl Teilnehmer', name: 'anzahlTeilnehmer', type: 'number', required: true },
    { id: 'einzelpreis', label: 'Einzelpreis', name: 'einzelpreis', type: 'number', required: false },
    { id: 'gesamtpreis', label: 'Gesamtpreis', name: 'gesamtpreis', type: 'number', required: false },
  ];

  // Templates aus der DB laden
  useEffect(() => {
    fetch('/api/einsatztemplates')
      .then(res => res.json())
      .then(data => setTemplates(data));
  }, []);

  const handleAddTemplate = async () => {
    if (!newTemplateName.trim()) return;
    const mapField = (f: TemplateField) => ({
      name: f.name,
      type: f.type,
      required: f.required,
      options: f.options,
      defaultValue: f.defaultValue,
    });
    const newTemplate = {
      name: newTemplateName,
      description: newTemplateDesc,
      fields: [...standardFields, ...customFields].map(mapField),
    };
    const res = await fetch('/api/einsatztemplates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTemplate),
    });
    if (res.ok) {
      const saved = await res.json();
      setTemplates(prev => [...prev, saved]);
      setNewTemplateName('');
      setNewTemplateDesc('');
      setCustomFields([]);
    } else {
      alert('Fehler beim Speichern des Templates');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Einsatztemplates verwalten</h2>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Template-Name"
          value={newTemplateName}
          onChange={e => setNewTemplateName(e.target.value)}
          className="px-3 py-2 border rounded mr-2"
        />
        <input
          type="text"
          placeholder="Beschreibung (optional)"
          value={newTemplateDesc}
          onChange={e => setNewTemplateDesc(e.target.value)}
          className="px-3 py-2 border rounded mr-2"
        />
      </div>
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Standardfelder</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {standardFields.map(f => (
            <li key={f.id} className="flex items-center space-x-2">
              <span className="font-medium">{f.label}</span>
              <span className="text-xs text-gray-500">({f.type})</span>
              {f.required && <span className="text-xs text-red-500">Pflichtfeld</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-6">
        <TemplateFieldEditor fields={customFields} onChange={setCustomFields} />
      </div>
      <button
        type="button"
        onClick={handleAddTemplate}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Template speichern
      </button>
      <ul className="space-y-3 mt-8">
        {templates.map(template => (
          <li key={template._id} className="p-4 bg-gray-50 rounded border">
            <div className="font-semibold">{template.name}</div>
            <div className="text-sm text-gray-600">{template.description}</div>
            <div className="text-xs text-gray-400">Felder: {template.fields.length}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
