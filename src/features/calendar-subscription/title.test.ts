import { describe, expect, it } from 'vitest';
import { defaultCalendarExportConfig } from './config';
import { composeCalendarExportEventTitle } from './title';

describe('composeCalendarExportEventTitle', () => {
  it('joins categories and helper count in one bracket group', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Führung',
        categoryAbbreviations: ['DA', 'VA'],
        assignedHelperFirstNames: ['Erika'],
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
        assignedHelperFirstNames: [],
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
        assignedHelperFirstNames: ['Erika'],
        assignedHelpers: 1,
        helpersNeeded: 2,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            eventTitle: false,
            assignedHelperNames: false,
            categories: false,
            helperCount: false,
          },
        },
      })
    ).toBe('Führung');
  });

  it('prepends assigned helper names and the number of open positions when enabled', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Kassa/Café',
        categoryAbbreviations: [],
        assignedHelperFirstNames: ['Raphael'],
        assignedHelpers: 1,
        helpersNeeded: 2,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            ...defaultCalendarExportConfig.titleAdditions,
            assignedHelperNames: true,
          },
        },
      })
    ).toBe('Raphael + 1 | Kassa/Café (1/2)');
  });

  it('omits the helper name block when no helper is assigned', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Kassa/Café',
        categoryAbbreviations: [],
        assignedHelperFirstNames: [],
        assignedHelpers: 0,
        helpersNeeded: 2,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            eventTitle: false,
            assignedHelperNames: true,
            categories: false,
            helperCount: false,
          },
        },
      })
    ).toBe('Kassa/Café');
  });

  it('uses one number for multiple open positions', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Kassa/Café',
        categoryAbbreviations: [],
        assignedHelperFirstNames: ['Luca'],
        assignedHelpers: 1,
        helpersNeeded: 4,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            eventTitle: false,
            assignedHelperNames: true,
            categories: false,
            helperCount: false,
          },
        },
      })
    ).toBe('Luca + 3');
  });

  it('separates multiple assigned helper names with commas', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Kassa/Café',
        categoryAbbreviations: [],
        assignedHelperFirstNames: ['Raphael', 'Luca'],
        assignedHelpers: 2,
        helpersNeeded: 3,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            eventTitle: false,
            assignedHelperNames: true,
            categories: false,
            helperCount: false,
          },
        },
      })
    ).toBe('Raphael, Luca + 1');
  });

  it('shows all assigned helpers when more helpers are assigned than needed', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Kassa/Café',
        categoryAbbreviations: [],
        assignedHelperFirstNames: ['Raphael', 'Luca', 'Anna'],
        assignedHelpers: 3,
        helpersNeeded: 2,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            ...defaultCalendarExportConfig.titleAdditions,
            assignedHelperNames: true,
          },
        },
      })
    ).toBe('Raphael, Luca, Anna | Kassa/Café (3/2)');
  });

  it('falls back to the event title when all title parts are disabled', () => {
    expect(
      composeCalendarExportEventTitle({
        title: 'Kassa/Café',
        categoryAbbreviations: ['CA'],
        assignedHelperFirstNames: ['Raphael'],
        assignedHelpers: 1,
        helpersNeeded: 2,
        config: {
          ...defaultCalendarExportConfig,
          titleAdditions: {
            eventTitle: false,
            assignedHelperNames: false,
            categories: false,
            helperCount: false,
          },
        },
      })
    ).toBe('Kassa/Café');
  });
});
