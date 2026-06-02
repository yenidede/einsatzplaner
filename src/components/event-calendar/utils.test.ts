/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
  generateDynamicSchema,
  isMultiDayEvent,
  mapDbDataTypeToFormFieldType,
  mapEinsatzToCalendarEvent,
  mapStringValueToType,
  mapTypeToStringValue,
  spansMultipleDays,
} from './utils';
import type { CalendarEvent } from './types';
import type { EinsatzForCalendar } from '@/features/einsatz/types';

describe('event calendar multi-day helpers', () => {
  it('erkennt Spannen über Monatsgrenzen als mehrtägig', () => {
    const event = {
      id: 'cross-month',
      title: 'Monatswechsel',
      start: new Date(2026, 3, 1, 8, 0, 0),
      end: new Date(2026, 4, 1, 9, 0, 0),
      assignedUsers: [],
      helpersNeeded: 0,
    } satisfies CalendarEvent;

    expect(spansMultipleDays(event)).toBe(true);
    expect(isMultiDayEvent(event)).toBe(true);
  });

  it('behandelt ganztägige Ein-Tages-Einsätze nicht als Spanne', () => {
    const event = {
      id: 'single-all-day',
      title: 'Ganztägig',
      start: new Date(2026, 3, 20, 0, 0, 0),
      end: new Date(2026, 3, 20, 23, 59, 59),
      allDay: true,
      assignedUsers: [],
      helpersNeeded: 0,
    } satisfies CalendarEvent;

    expect(spansMultipleDays(event)).toBe(false);
    expect(isMultiDayEvent(event)).toBe(true);
  });
});

describe('mapEinsatzToCalendarEvent', () => {
  it('zeigt Kategorien und belegte Personen im Titel', () => {
    const einsatz = {
      id: 'einsatz-1',
      title: 'Führung',
      start: new Date(2026, 5, 10, 10),
      end: new Date(2026, 5, 10, 11),
      all_day: false,
      helpers_needed: 2,
      einsatz_helper: [{ user_id: 'user-1' }],
      _count: { einsatz_helper: 1 },
      einsatz_status: {
        id: 'status-1',
        verwalter_color: 'blue',
        verwalter_text: 'Offen',
        helper_color: 'blue',
        helper_text: 'Offen',
      },
      einsatz_to_category: [
        {
          einsatz_category: {
            value: 'Dauerausstellung',
            abbreviation: 'DA',
          },
        },
      ],
    } satisfies EinsatzForCalendar;

    expect(mapEinsatzToCalendarEvent(einsatz)?.title).toBe(
      'Führung (DA) (1/2)'
    );
  });
});

describe('generateDynamicSchema', () => {
  it('unterstützt date/time Felder für Pflichtangaben', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'd1',
        type: 'date',
        options: { isRequired: true },
      },
      {
        fieldId: 't1',
        type: 'time',
        options: { isRequired: true },
      },
    ]);

    const parsed = schema.parse({
      d1: '2026-04-20',
      t1: '13:45',
    });

    expect(parsed).toEqual({
      d1: '2026-04-20',
      t1: '13:45',
    });
  });

  it('lehnt ungültige date/time Werte ab', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'd1',
        type: 'date',
        options: { isRequired: true },
      },
      {
        fieldId: 't1',
        type: 'time',
        options: { isRequired: true },
      },
    ]);

    const result = schema.safeParse({
      d1: '20-04-2026',
      t1: '25:61',
    });

    expect(result.success).toBe(false);
  });

  it('ignoriert group-Felder in der Schemaerzeugung', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'g1',
        type: 'group',
        options: {},
      },
      {
        fieldId: 'txt1',
        type: 'text',
        options: { isRequired: false },
      },
    ]);

    const parsed = schema.parse({
      txt1: 'Wert',
    });

    expect(parsed).toEqual({
      txt1: 'Wert',
    });
  });

  it('fordert bei Pflicht-Mehrfachauswahl mindestens einen Wert', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'multi1',
        type: 'multiselect',
        options: { isRequired: true, allowedValues: ['A', 'B'] },
      },
    ]);

    expect(schema.safeParse({ multi1: [] }).success).toBe(false);
    expect(schema.parse({ multi1: ['A'] })).toEqual({ multi1: ['A'] });
  });

  it('behält historische Mehrfachwerte beim Validieren bei', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'multi1',
        type: 'multiselect',
        options: { allowedValues: ['Aktuell'] },
      },
    ]);

    expect(schema.parse({ multi1: ['Historisch'] })).toEqual({
      multi1: ['Historisch'],
    });
  });

  it('serialisiert Mehrfachwerte kommasepariert', () => {
    expect(mapStringValueToType(' A, B ', 'multiselect')).toEqual(['A', 'B']);
    expect(mapTypeToStringValue(['A', 'B'])).toBe('A,B');
    expect(mapDbDataTypeToFormFieldType('multiselect')).toBe('multi-select');
  });

  it('erlaubt leere optionale Telefon- und E-Mail-Felder', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'phone1',
        type: 'phone',
        options: { isRequired: false },
      },
      {
        fieldId: 'mail1',
        type: 'mail',
        options: { isRequired: false },
      },
    ]);

    expect(schema.parse({ phone1: null, mail1: null })).toEqual({
      phone1: '',
      mail1: '',
    });
  });

  it('zeigt für fehlende Pflichtwerte verständliche deutsche Meldungen', () => {
    const schema = generateDynamicSchema([
      {
        fieldId: 'phone1',
        type: 'phone',
        options: { isRequired: true },
      },
      {
        fieldId: 'select1',
        type: 'select',
        options: { isRequired: true, allowedValues: ['A'] },
      },
    ]);

    const result = schema.safeParse({ phone1: null, select1: null });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual([
      'Bitte geben Sie eine Telefonnummer ein',
      'Bitte wählen Sie eine Option aus',
    ]);
  });
});
