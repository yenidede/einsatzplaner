import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    einsatz_category: {
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

import { createCategory, updateCategory } from './cat-dal';

describe('Kategorie-DAL', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockUpdate.mockReset();
  });

  it('lehnt beim Anlegen ein leeres Kürzel ab', async () => {
    await expect(
      createCategory({
        org_id: 'orga-1',
        value: 'Dauerausstellung',
        abbreviation: '   ',
      })
    ).rejects.toThrow('Kürzel darf nicht leer sein');

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('lehnt beim Bearbeiten ein leeres Kürzel ab', async () => {
    await expect(
      updateCategory('cat-1', {
        value: 'Dauerausstellung',
        abbreviation: '   ',
      })
    ).rejects.toThrow('Kürzel darf nicht leer sein');

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
