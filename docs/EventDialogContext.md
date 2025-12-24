# Event Dialog Context

The event dialog state is now managed globally through a React Context, allowing any component in your application to open the event dialog from anywhere.

## Files Created/Modified

1. **Created**: `src/contexts/EventDialogContext.tsx` - Context provider and hook
2. **Created**: `src/hooks/use-event-dialog.ts` - Convenience hook export
3. **Modified**: `src/components/event-calendar/event-calendar.tsx` - Now uses context instead of local state
4. **Modified**: `src/components/event-calendar/calendar-client.tsx` - Wrapped with EventDialogProvider

## Usage

### Opening the Dialog from Anywhere

```tsx
import { useEventDialog } from "@/hooks/use-event-dialog";

function MyComponent() {
  const { openDialog } = useEventDialog();

  const handleClick = () => {
    // Open dialog with an event ID (string)
    openDialog("event-uuid-here");

    // Or open dialog with a new event object
    openDialog({
      title: "New Event",
      start: new Date(),
      end: new Date(),
      org_id: "org-uuid",
      created_by: "user-uuid",
      // ... other fields
    });

    // Or open dialog for creating a new event
    openDialog(null);
  };

  return <button onClick={handleClick}>Open Event Dialog</button>;
}
```

### Context API

```typescript
interface EventDialogContextValue {
  isOpen: boolean; // Current dialog state
  selectedEvent: EinsatzCreate | string | null; // Currently selected event
  openDialog: (event: EinsatzCreate | string | null) => void; // Open dialog
  closeDialog: () => void; // Close dialog
}
```

### Example: Opening from Notification Menu

```tsx
import { useEventDialog } from "@/hooks/use-event-dialog";

function NotificationItem({ einsatzId }: { einsatzId: string }) {
  const { openDialog } = useEventDialog();

  return (
    <button onClick={() => openDialog(einsatzId)}>View Einsatz Details</button>
  );
}
```

## Benefits

- ✅ Open event dialog from any component
- ✅ No need to pass callbacks through multiple layers
- ✅ Centralized state management
- ✅ Consistent dialog behavior across the app
- ✅ Easy to test and maintain
