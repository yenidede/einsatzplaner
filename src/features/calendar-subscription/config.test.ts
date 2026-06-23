import { describe, expect, it } from 'vitest';
import { parseCalendarExportConfig } from './config';

describe('parseCalendarExportConfig', () => {
  it('fills new title settings for existing calendar export configs', () => {
    expect(
      parseCalendarExportConfig({
        version: 1,
        mode: 'helper',
        categoryIds: [],
        statusIds: [],
        statusPseudo: [],
        timeWindow: null,
        includeAllDay: true,
        futureOnly: false,
        titleAdditions: {
          categories: true,
          helperCount: true,
        },
      }).titleAdditions
    ).toEqual({
      eventTitle: true,
      assignedHelperNames: false,
      categories: true,
      helperCount: true,
    });
  });
});
