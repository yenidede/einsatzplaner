# Calendar Component

A modular, functional calendar component built with FullCalendar and React, following state-of-the-art functional programming patterns.

## Architecture

The calendar component has been split into multiple focused modules:

### 📁 File Structure

```
calendar/
├── index.ts              # Main exports and public API
├── calendar.tsx           # Backward compatibility wrapper
├── types.ts              # TypeScript type definitions
├── utils.ts              # Pure utility functions
├── hooks.ts              # Custom React hooks
├── Card.tsx              # Reusable Card component
├── EventDetailsModal.tsx # Event details modal component
├── FullCalendarGroupSchedule.tsx # Main calendar component
└── README.md             # This file
```

### 🏗️ Functional Programming Patterns

#### 1. **Separation of Concerns**

- **Types** (`types.ts`): All TypeScript interfaces and types
- **Utils** (`utils.ts`): Pure functions for data transformation and configuration
- **Hooks** (`hooks.ts`): React state management and side effects
- **Components**: UI components with minimal logic

#### 2. **Pure Functions**

All utility functions are pure (no side effects):

- `getLocale()`: Returns locale configuration
- `transformScheduleToEvents()`: Transforms data without mutation
- `getCalendarConfig()`: Returns calendar configuration object
- `formatTimeForDisplay()`: Formats time strings

#### 3. **Immutable Data Flow**

- Data transformations create new objects instead of mutating existing ones
- State updates follow React's immutability patterns
- Event handlers are memoized with `useCallback`

#### 4. **Custom Hooks Pattern**

The `useCalendarState` hook encapsulates:

- Event transformation logic
- Modal state management
- Event click handling
- Proper TypeScript typing

#### 5. **Component Composition**

- Small, focused components that do one thing well
- Clear prop interfaces
- Proper TypeScript typing throughout

## Usage

### Basic Usage

```tsx
import { FullCalendarGroupSchedule } from "@/components/calendar";
import type { ScheduleGroup } from "@/components/calendar";

const scheduleData: ScheduleGroup = {
  "2025-01-15": [
    {
      id: "1",
      name: "Meeting",
      date: new Date("2025-01-15"),
      start_time: new Date("2025-01-15T09:00:00"),
      end_time: new Date("2025-01-15T10:00:00"),
      organization: { name: "Company A" },
    },
  ],
};

function MyCalendar() {
  return (
    <FullCalendarGroupSchedule
      scheduleData={scheduleData}
      maxEventsPerDay={4}
      onEventClick={(eventInfo) => console.log("Event clicked:", eventInfo)}
    />
  );
}
```

### Using Individual Components

```tsx
import {
  EventDetailsModal,
  useCalendarState,
  transformScheduleToEvents,
} from "@/components/calendar";

// Use the custom hook independently
const { events, selectedEvent, isModalOpen, handleEventClick, closeModal } =
  useCalendarState(scheduleData);

// Use utility functions
const events = transformScheduleToEvents(scheduleData);
```

### Extending the Component

The modular structure makes it easy to:

1. **Add new calendar views**: Extend the `getCalendarConfig` function
2. **Customize event rendering**: Modify the `renderEventContent` function
3. **Add new event types**: Extend the `Einsatz` interface
4. **Create custom modals**: Replace or extend `EventDetailsModal`

## Type Safety

All components are fully typed with TypeScript:

- `CalendarProps`: Main component props
- `Einsatz`: Event data structure
- `ScheduleGroup`: Grouped event data
- `SelectedEvent`: Modal event data
- `Language`: Supported locales

## Benefits of This Architecture

1. **Maintainability**: Each file has a single responsibility
2. **Testability**: Pure functions are easy to unit test
3. **Reusability**: Components and hooks can be used independently
4. **Type Safety**: Full TypeScript coverage prevents runtime errors
5. **Performance**: Memoized functions and proper React patterns
6. **Extensibility**: Easy to add new features without breaking existing code

## Migration Guide

The original `calendar.tsx` now serves as a compatibility wrapper. Existing imports will continue to work:

```tsx
// This still works
import { FullCalendarGroupSchedule } from "@/components/calendar/calendar";

// But this is preferred
import { FullCalendarGroupSchedule } from "@/components/calendar";
```
