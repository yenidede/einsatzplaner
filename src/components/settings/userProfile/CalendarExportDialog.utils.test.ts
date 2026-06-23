import { describe, expect, it } from 'vitest';
import {
  getCalendarExportNameAfterOrgChange,
  getPreviewDurationTag,
} from './CalendarExportDialog.utils';

describe('getPreviewDurationTag', () => {
  it('returns no tag for same-day events', () => {
    expect(
      getPreviewDurationTag({
        start: '2025-09-03T05:44:00.000Z',
        end: '2025-09-03T06:44:00.000Z',
      })
    ).toBeNull();
  });

  it('returns a singular day tag for events spanning one calendar day', () => {
    expect(
      getPreviewDurationTag({
        start: '2025-09-03T05:44:00.000Z',
        end: '2025-09-04T06:44:00.000Z',
      })
    ).toBe('1 Tag');
  });

  it('returns the number of calendar days for multi-day events', () => {
    expect(
      getPreviewDurationTag({
        start: '2025-09-03T05:44:00.000Z',
        end: '2025-09-25T06:44:00.000Z',
      })
    ).toBe('22 Tage');
  });
});

describe('getCalendarExportNameAfterOrgChange', () => {
  it('keeps the current name when editing an existing export', () => {
    expect(
      getCalendarExportNameAfterOrgChange({
        currentName: 'Nur eigene in der Zukunft',
        isEditingExistingExport: true,
      })
    ).toBe('Nur eigene in der Zukunft');
  });

  it('clears the name when creating a new export', () => {
    expect(
      getCalendarExportNameAfterOrgChange({
        currentName: 'Nur eigene in der Zukunft',
        isEditingExistingExport: false,
      })
    ).toBe('');
  });
});
