import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireAuth,
  mockHasPermission,
  mockCreate,
  mockUpdate,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockHasPermission: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/auth/authGuard', () => ({
  requireAuth: mockRequireAuth,
  hasPermission: mockHasPermission,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    einsatz_template: {
      create: mockCreate,
      update: mockUpdate,
    },
  },
}));

import { createTemplateAction, updateTemplateAction } from './template-dal';

describe('template dal', () => {
  beforeEach(() => {
    mockRequireAuth.mockReset();
    mockHasPermission.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();

    mockRequireAuth.mockResolvedValue({
      session: {
        user: {
          id: 'user-1',
          activeOrganization: { id: 'org-1' },
        },
      },
      userIds: { orgId: 'org-1' },
    });
    mockHasPermission.mockResolvedValue(true);
  });

  it('speichert alle bearbeitbaren Standardfelder inklusive Gesamtpreis und Anmerkung', async () => {
    mockUpdate.mockResolvedValue({
      id: 'template-1',
    });

    await updateTemplateAction('template-1', {
      name: 'Einsatzvorlage',
      icon_id: 'icon-1',
      description: 'Beschreibung',
      is_paused: true,
      participant_count_default: 12,
      participant_count_placeholder: 18,
      price_person_default: 9.5,
      price_person_placeholder: 11.25,
      helpers_needed_default: 4,
      helpers_needed_placeholder: 6,
      all_day_default: false,
      total_price_default: 120,
      total_price_placeholder: 150,
      anmerkung_default: 'Standardnotiz',
      anmerkung_placeholder: 'Platzhaltertext',
      time_start_default: new Date('2026-04-20T08:30:00.000Z'),
      time_end_default: new Date('2026-04-20T11:00:00.000Z'),
      einsatzname_default: 'Vorbelegt',
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'template-1' },
      data: {
        name: 'Einsatzvorlage',
        icon_id: 'icon-1',
        description: 'Beschreibung',
        is_paused: true,
        participant_count_default: 12,
        participant_count_placeholder: 18,
        price_person_default: 9.5,
        price_person_placeholder: 11.25,
        helpers_needed_default: 4,
        helpers_needed_placeholder: 6,
        all_day_default: false,
        total_price_default: 120,
        total_price_placeholder: 150,
        anmerkung_default: 'Standardnotiz',
        anmerkung_placeholder: 'Platzhaltertext',
        time_start_default: new Date('2026-04-20T08:30:00.000Z'),
        time_end_default: new Date('2026-04-20T11:00:00.000Z'),
        einsatzname_default: 'Vorbelegt',
      },
    });
  });

  it('normalisiert die Beschreibung beim Erstellen einer Vorlage', async () => {
    mockCreate.mockResolvedValue({
      id: 'template-1',
    });

    await createTemplateAction({
      org_id: 'org-1',
      name: 'Einsatzvorlage',
      icon_id: 'icon-1',
      description: '  Beschreibung  ',
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        org_id: 'org-1',
        name: 'Einsatzvorlage',
        icon_id: 'icon-1',
        description: 'Beschreibung',
      },
    });
  });

  it('lehnt eine Beschreibung mit mehr als 80 Zeichen ab', async () => {
    mockUpdate.mockResolvedValue({
      id: 'template-1',
    });

    await expect(
      updateTemplateAction('template-1', {
        description: 'a'.repeat(81),
      })
    ).rejects.toThrow('Die Beschreibung darf höchstens 80 Zeichen lang sein.');

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
