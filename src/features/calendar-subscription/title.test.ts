import { describe, expect, it } from 'vitest';
import { defaultCalendarExportConfig } from './config';
import { composeCalendarExportEventTitle } from './title';

describe('composeCalendarExportEventTitle', () => {
  it('joins categories and helper count in one bracket group', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Führung',
        categoryAbbreviations: ['DA', 'VA'],
        assignedHelpers: 1,
        helpersNeeded: 2,
        config: defaultCalendarExportConfig,
      })
    ).toBe('Führung (DA, VA · 1/2)');
  });

  it('omits helper count when no helpers are needed', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Führung',
        categoryAbbreviations: ['DA'],
        assignedHelpers: 0,
        helpersNeeded: 0,
        config: defaultCalendarExportConfig,
      })
    ).toBe('Führung (DA)');
  });

  it('returns only the title when additions are disabled', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Führung',
        categoryAbbreviations: ['DA'],
        assignedHelpers: 1,
        helpersNeeded: 2,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            categories: false,
            helperCount: false,
          },
        },
      })
    ).toBe('Führung');
  });
});
