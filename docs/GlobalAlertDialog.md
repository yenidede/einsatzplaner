# Global AlertDialog Implementation

## Overview

The AlertDialog has been implemented at the layout level using React Context, allowing you to show confirmation dialogs from anywhere in your application.

## Files Created/Updated:

- `src/contexts/AlertDialogContext.tsx` - The global context provider
- `src/app/layout.tsx` - Updated to include the AlertDialog provider
- `src/components/examples/GlobalAlertDialogDemo.tsx` - Demo component showing usage

## Usage

### 1. Import the hook

```tsx
import { useAlertDialog } from "@/contexts/AlertDialogContext";
```

### 2. Use in any component

```tsx
function MyComponent() {
  const { showDialog } = useAlertDialog();

  const handleDelete = async () => {
    const result = await showDialog({
      title: "Einsatz löschen",
      description: "Sind Sie sicher, dass Sie diesen Einsatz löschen möchten?",
    });

    if (result === "success") {
      // User clicked "Bestätigen"
      console.log("User confirmed");
    } else {
      // User clicked "Abbrechen" or closed the dialog
      console.log("User cancelled");
    }
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### 3. Available Options

```tsx
type AlertDialogOptions = {
  title: string; // Dialog title
  description: string; // Dialog description/message
};
```

### 4. Return Values

- `"success"` - User clicked "Bestätigen"
- `"cancel"` - User clicked "Abbrechen" or closed the dialog

## Example Use Cases

### Delete Confirmation

```tsx
const result = await showDialog({
  title: "Einsatz löschen",
  description: "Diese Aktion kann nicht rückgängig gemacht werden.",
});
```

### Save Confirmation

```tsx
const result = await showDialog({
  title: "Änderungen speichern",
  description: "Möchten Sie die Änderungen speichern?",
});
```

### Generic Confirmation

```tsx
const result = await showDialog({
  title: "Aktion bestätigen",
  description: "Sind Sie sicher, dass Sie fortfahren möchten?",
});
```

## Benefits

- ✅ Single dialog instance across the entire app
- ✅ Promise-based API for clean async/await usage
- ✅ Automatic cleanup and state management
- ✅ Consistent styling and behavior
- ✅ Type-safe with TypeScript
- ✅ No need to manage dialog state in individual components
