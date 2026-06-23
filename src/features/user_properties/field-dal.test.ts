import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindField, mockFindEinsatzValues, mockFindUserPropertyValues } =
  vi.hoisted(() => ({
    mockFindField: vi.fn(),
    mockFindEinsatzValues: vi.fn(),
    mockFindUserPropertyValues: vi.fn(),
  }));

vi.mock('@/lib/prisma', () => ({
  default: {
    field: {
      findUnique: mockFindField,
    },
    einsatz_field: {
      findMany: mockFindEinsatzValues,
    },
    user_property_value: {
      findMany: mockFindUserPropertyValues,
    },
  },
}));

import { assertCanChangeMultiselectToSelect } from './field-dal';

describe('assertCanChangeMultiselectToSelect', () => {
  beforeEach(() => {
    mockFindField.mockReset();
    mockFindEinsatzValues.mockReset();
    mockFindUserPropertyValues.mockReset();
    mockFindField.mockResolvedValue({
      type: {
        datatype: 'multiselect',
      },
    });
    mockFindEinsatzValues.mockResolvedValue([]);
    mockFindUserPropertyValues.mockResolvedValue([]);
  });

  it('blockiert den Rückwechsel bei mehreren gespeicherten Werten', async () => {
    mockFindEinsatzValues.mockResolvedValue([{ value: 'Sanität,Technik' }]);

    await expect(
      assertCanChangeMultiselectToSelect('field-1', 'select')
    ).rejects.toThrow(
      'Mehrfachauswahl kann nicht deaktiviert werden, solange mindestens ein Datensatz mehrere Werte enthält.'
    );
  });

  it('erlaubt den Rückwechsel bei höchstens einem gespeicherten Wert', async () => {
    mockFindUserPropertyValues.mockResolvedValue([{ value: 'Sanität' }]);

    await expect(
      assertCanChangeMultiselectToSelect('field-1', 'select')
    ).resolves.toBeUndefined();
  });
});
