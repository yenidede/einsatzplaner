# DynamicFormFields - React Hook Form Integration

## Übersicht

Die `DynamicFormFields` Komponente ist jetzt korrekt mit **React Hook Form** integriert und verwendet automatische Validierung durch das dynamische Zod-Schema.

## Verwendung

### 1. Setup in der Parent-Komponente (event-dialog.tsx)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateDynamicSchema, mapFieldsForSchema } from './utils';
import DynamicFormFields from './dynamicFormfields';

// Dynamisches Schema generieren basierend auf Template-Feldern
const dynamicSchema = generateDynamicSchema(
  mapFieldsForSchema(templateData.template_to_field)
);

// React Hook Form initialisieren
const dynamicForm = useForm({
  resolver: zodResolver(dynamicSchema),
  mode: 'onChange', // oder 'onBlur', 'onSubmit'
  defaultValues: {}, // Initialisiere mit vorhandenen Daten
});

// Beim Submit
const onSubmit = dynamicForm.handleSubmit((data) => {
  console.log('Validierte Daten:', data);
  // Weiterverarbeitung...
});
```

### 2. Komponente verwenden

```tsx
<form onSubmit={onSubmit}>
  <DynamicFormFields
    fields={dynamicFormFields}
    control={dynamicForm.control}
    errors={dynamicForm.formState.errors}
  />

  <button type="submit">Speichern</button>
</form>
```

## Props

| Prop      | Typ                 | Beschreibung                                   |
| --------- | ------------------- | ---------------------------------------------- |
| `fields`  | `CustomFormField[]` | Array von Feld-Definitionen                    |
| `control` | `Control<any>`      | React Hook Form Control-Objekt                 |
| `errors`  | `FieldErrors<any>`  | Optional: Fehler-Objekt aus `formState.errors` |

## Vorteile

✅ **Automatische Validierung**: Zod-Schema validiert automatisch beim Ändern/Blur  
✅ **Type-Safety**: TypeScript-Typen durch Zod-Inferenz  
✅ **Performance**: Nur betroffene Felder werden re-rendered  
✅ **Keine manuelle State-Verwaltung**: React Hook Form übernimmt alles  
✅ **Einfache Fehlerbehandlung**: Fehler werden automatisch den Feldern zugeordnet

## Beispiel: Vollständige Integration

```typescript
// 1. Schema generieren wenn Template ausgewählt wird
useEffect(() => {
  if (activeTemplateId && templateData) {
    const schema = generateDynamicSchema(
      mapFieldsForSchema(templateData.template_to_field)
    );

    // Form mit neuem Schema reset
    dynamicForm.reset(
      {},
      {
        keepValues: false,
      }
    );
  }
}, [activeTemplateId, templateData]);

// 2. Vorhandene Daten laden
useEffect(() => {
  if (einsatzData?.custom_fields) {
    const formValues = {};
    einsatzData.custom_fields.forEach((field) => {
      formValues[field.field_id] = mapStringValueToType(
        field.value,
        field.field.type?.datatype
      );
    });
    dynamicForm.reset(formValues);
  }
}, [einsatzData]);

// 3. Beim Speichern
const handleSave = async () => {
  const isValid = await dynamicForm.trigger(); // Validierung erzwingen

  if (isValid) {
    const values = dynamicForm.getValues();

    // In Datenbank-Format konvertieren
    const einsatzFields = Object.entries(values).map(([field_id, value]) => ({
      field_id,
      value: mapTypeToStringValue(value),
    }));

    // Speichern...
  }
};
```

## Migration von der alten Implementierung

### Vorher (manuelles State-Management)

```tsx
const [dynamicFormData, setDynamicFormData] = useState({});

<DynamicFormFields
  fields={dynamicFormFields}
  formData={dynamicFormData}
  errors={errors.fieldErrors}
  onFormDataChange={(data) =>
    setDynamicFormData((prev) => ({ ...prev, ...data }))
  }
/>;
```

### Nachher (React Hook Form)

```tsx
const dynamicForm = useForm({
  resolver: zodResolver(dynamicSchema),
});

<DynamicFormFields
  fields={dynamicFormFields}
  control={dynamicForm.control}
  errors={dynamicForm.formState.errors}
/>;
```

## Wichtige Hinweise

1. **Schema muss vor Form-Initialisierung erstellt werden**
2. **Bei Template-Wechsel Form mit `reset()` zurücksetzen**
3. **`Controller` Component wird intern für jedes Feld verwendet**
4. **Fehler werden automatisch an die richtige Stelle gemappt**
