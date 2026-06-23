import { Prisma } from '@/generated/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireAuth,
  mockHasPermission,
  mockCreateChangeLogAuto,
  mockCheckEinsatzRequirementsAfterAssignment,
  mockTransaction,
  mockFindUnique,
  mockCreate,
  mockUpdate,
  mockFindManyConflicts,
  mockPrismaEinsatzFindUnique,
  mockPrismaEinsatzUpdate,
  mockChangeTypeFindUnique,
  mockChangeLogCreate,
  mockConsoleWarn,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockHasPermission: vi.fn(),
  mockCreateChangeLogAuto: vi.fn(),
  mockCheckEinsatzRequirementsAfterAssignment: vi.fn(),
  mockTransaction: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindManyConflicts: vi.fn(),
  mockPrismaEinsatzFindUnique: vi.fn(),
  mockPrismaEinsatzUpdate: vi.fn(),
  mockChangeTypeFindUnique: vi.fn(),
  mockChangeLogCreate: vi.fn(),
  mockConsoleWarn: vi.fn(),
}));

vi.mock('@/lib/auth/authGuard', () => ({
  requireAuth: mockRequireAuth,
  hasPermission: mockHasPermission,
}));

vi.mock('@/features/activity_log/activity_log-dal', () => ({
  createChangeLogAuto: mockCreateChangeLogAuto,
}));

vi.mock('@/lib/email/email-helpers', () => ({
  checkEinsatzRequirementsAfterAssignment:
    mockCheckEinsatzRequirementsAfterAssignment,
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mockTransaction,
    einsatz: {
      findUnique: mockPrismaEinsatzFindUnique,
      create: mockCreate,
      update: mockPrismaEinsatzUpdate,
    },
    change_type: {
      findUnique: mockChangeTypeFindUnique,
    },
    change_log: {
      create: mockChangeLogCreate,
    },
    einsatz_helper: {
      findMany: mockFindManyConflicts,
    },
  },
}));

import { StatusValuePairs } from '@/components/event-calendar/constants';
import { ChangeTypeIds } from '@/features/activity_log/changeTypeIds';
import {
  createEinsatz,
  toggleUserAssignmentToEinsatz,
  updateEinsatzStatus,
} from './dal-einsatz';

describe('toggleUserAssignmentToEinsatz', () => {
  beforeEach(() => {
    let assigned = false;

    vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);
    mockRequireAuth.mockResolvedValue({
      session: {
        user: {
          id: 'user-1',
          orgIds: ['org-1'],
          activeOrganization: { id: 'org-1' },
        },
      },
    });
    mockHasPermission.mockResolvedValue(true);
    mockCreateChangeLogAuto.mockResolvedValue(undefined);
    mockCheckEinsatzRequirementsAfterAssignment.mockResolvedValue(undefined);
    mockFindManyConflicts.mockResolvedValue([]);
    mockPrismaEinsatzFindUnique.mockReset();
    mockCreate.mockReset();
    mockPrismaEinsatzUpdate.mockReset();
    mockChangeTypeFindUnique.mockReset();
    mockChangeLogCreate.mockReset();
    mockConsoleWarn.mockReset();

    mockFindUnique.mockImplementation(async () => {
      if (assigned) {
        return {
          id: 'einsatz-1',
          title: 'Testeinsatz',
          org_id: 'org-1',
          start: new Date('2026-04-04T08:00:00.000Z'),
          end: new Date('2026-04-04T10:00:00.000Z'),
          helpers_needed: 2,
          einsatz_helper: [{ user_id: 'user-1' }],
          status_id: 'status-assigned',
        };
      }

      return {
        id: 'einsatz-1',
        title: 'Testeinsatz',
        org_id: 'org-1',
        start: new Date('2026-04-04T08:00:00.000Z'),
        end: new Date('2026-04-04T10:00:00.000Z'),
        helpers_needed: 2,
        einsatz_helper: [],
        status_id: 'status-open',
      };
    });

    mockUpdate.mockImplementation(async () => {
      assigned = true;

      return {
        id: 'einsatz-1',
        title: 'Testeinsatz',
        org_id: 'org-1',
        start: new Date('2026-04-04T08:00:00.000Z'),
        end: new Date('2026-04-04T10:00:00.000Z'),
        helpers_needed: 2,
        status_id: 'status-assigned',
      };
    });

    mockTransaction.mockImplementation(
      async (
        callback: (tx: {
          einsatz: {
            findUnique: typeof mockFindUnique;
            update: typeof mockUpdate;
          };
          einsatz_helper: {
            findMany: typeof mockFindManyConflicts;
          };
          change_log: {
            create: typeof mockChangeLogCreate;
          };
        }) => Promise<unknown>
      ) =>
        callback({
          einsatz: {
            findUnique: mockFindUnique,
            update: mockUpdate,
          },
          einsatz_helper: {
            findMany: mockFindManyConflicts,
          },
          change_log: {
            create: mockChangeLogCreate,
          },
        })
    );
  });

  it('behandelt doppelte Selbstzuweisung als No-op ohne zweiten Activity-Log-Eintrag oder Fehler', async () => {
    await expect(
      toggleUserAssignmentToEinsatz('einsatz-1', 'assign')
    ).resolves.toMatchObject({
      id: 'einsatz-1',
      title: 'Testeinsatz',
    });

    await expect(
      toggleUserAssignmentToEinsatz('einsatz-1', 'assign')
    ).resolves.toMatchObject({
      id: 'einsatz-1',
      title: 'Testeinsatz',
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockCreateChangeLogAuto).toHaveBeenCalledTimes(1);
    expect(mockCreateChangeLogAuto).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      userId: 'user-1',
      typeId: ChangeTypeIds['N-Eingetragen'],
      affectedUserId: 'user-1',
    });
    expect(mockCheckEinsatzRequirementsAfterAssignment).toHaveBeenCalledTimes(
      1
    );
  });

  it('erzwingt die Leave-Berechtigung auch bei einem idempotenten unassign-no-op', async () => {
    mockHasPermission.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      toggleUserAssignmentToEinsatz('einsatz-1', 'assign')
    ).resolves.toMatchObject({
      id: 'einsatz-1',
      title: 'Testeinsatz',
    });

    await expect(
      toggleUserAssignmentToEinsatz('einsatz-1', 'unassign')
    ).rejects.toThrow('Fehlende Berechtigungen für diese Organisation');

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockCreateChangeLogAuto).toHaveBeenCalledTimes(1);
  });

  it('gibt bei einem unassign-no-op ohne Organisationsmitgliedschaft keine Einsatzdaten preis', async () => {
    mockRequireAuth.mockResolvedValue({
      session: {
        user: {
          id: 'user-1',
          orgIds: ['org-2'],
          activeOrganization: { id: 'org-2' },
        },
      },
    });

    await expect(
      toggleUserAssignmentToEinsatz('einsatz-1', 'unassign')
    ).rejects.toThrow('Fehlende Berechtigungen für diese Organisation');

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreateChangeLogAuto).not.toHaveBeenCalled();
  });

  it('verwendet nach zwei serialisierbaren Transaktionskonflikten die benutzerfreundliche Fehlermeldung', async () => {
    const retryableError = new Prisma.PrismaClientKnownRequestError(
      'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
      {
        code: 'P2034',
        clientVersion: '6.0.0',
        meta: {},
      }
    );

    mockTransaction.mockRejectedValue(retryableError);

    await expect(
      toggleUserAssignmentToEinsatz('einsatz-1', 'assign')
    ).rejects.toThrow('Die Selbstzuweisung konnte nicht abgeschlossen werden.');

    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });
});

describe('updateEinsatzStatus', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);
    mockRequireAuth.mockResolvedValue({
      session: {
        user: {
          id: 'user-1',
          orgIds: ['org-1'],
          activeOrganization: { id: 'org-1' },
        },
      },
    });
    mockHasPermission.mockResolvedValue(true);
    mockTransaction.mockImplementation(
      async (
        callback: (tx: {
          einsatz: {
            update: typeof mockPrismaEinsatzUpdate;
          };
          change_log: {
            create: typeof mockChangeLogCreate;
          };
        }) => Promise<unknown>
      ) =>
        callback({
          einsatz: {
            update: mockPrismaEinsatzUpdate,
          },
          change_log: {
            create: mockChangeLogCreate,
          },
        })
    );
    mockPrismaEinsatzFindUnique.mockReset();
    mockPrismaEinsatzUpdate.mockReset();
    mockChangeTypeFindUnique.mockReset();
    mockChangeLogCreate.mockReset();
    mockConsoleWarn.mockReset();
  });

  it('schreibt bei Statuswechsel auf bestätigt einen Aktivitätseintrag', async () => {
    mockPrismaEinsatzFindUnique.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
    });
    mockPrismaEinsatzUpdate.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
      status_id: StatusValuePairs.vergeben_bestaetigt,
      title: 'Testeinsatz',
    });
    mockChangeTypeFindUnique.mockImplementation(
      async ({ where }: { where: { id?: string; name?: string } }) => {
        if (where.id === ChangeTypeIds['E-Bestaetigt']) {
          return { id: ChangeTypeIds['E-Bestaetigt'] };
        }
        return null;
      }
    );

    await updateEinsatzStatus(
      'einsatz-1',
      StatusValuePairs.vergeben_bestaetigt
    );

    expect(mockChangeLogCreate).toHaveBeenCalledWith({
      data: {
        einsatz_id: 'einsatz-1',
        user_id: 'user-1',
        type_id: ChangeTypeIds['E-Bestaetigt'],
        affected_user: null,
      },
    });
  });

  it('verwendet den Change-Type-Fallback über Namen, wenn die ID nicht auflösbar ist', async () => {
    mockPrismaEinsatzFindUnique.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
    });
    mockPrismaEinsatzUpdate.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
      status_id: StatusValuePairs.vergeben_bestaetigt,
      title: 'Testeinsatz',
    });
    mockChangeTypeFindUnique.mockImplementation(
      async ({ where }: { where: { id?: string; name?: string } }) => {
        if (where.id === ChangeTypeIds['E-Bestaetigt']) {
          return null;
        }
        if (where.name === 'E-Bestaetigt') {
          return { id: 'fallback-type-id' };
        }
        return null;
      }
    );

    await updateEinsatzStatus(
      'einsatz-1',
      StatusValuePairs.vergeben_bestaetigt
    );

    expect(mockChangeLogCreate).toHaveBeenCalledWith({
      data: {
        einsatz_id: 'einsatz-1',
        user_id: 'user-1',
        type_id: 'fallback-type-id',
        affected_user: null,
      },
    });
    expect(mockConsoleWarn).toHaveBeenCalled();
  });

  it('schreibt keinen Aktivitätseintrag bei anderen Statuswerten', async () => {
    mockPrismaEinsatzFindUnique.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
    });
    mockPrismaEinsatzUpdate.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
      status_id: StatusValuePairs.vergeben,
      title: 'Testeinsatz',
    });

    await updateEinsatzStatus('einsatz-1', StatusValuePairs.vergeben);

    expect(mockChangeLogCreate).not.toHaveBeenCalled();
    expect(mockChangeTypeFindUnique).not.toHaveBeenCalled();
  });

  it('wirft einen Fehler, wenn Change-Type-Auflösung fehlschlägt', async () => {
    mockPrismaEinsatzFindUnique.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
    });
    mockChangeTypeFindUnique.mockResolvedValue(null);

    await expect(
      updateEinsatzStatus('einsatz-1', StatusValuePairs.vergeben_bestaetigt)
    ).rejects.toThrow("Change-Type 'E-Bestaetigt' wurde nicht gefunden.");
  });

  it('wirft einen Fehler, wenn das Schreiben des Aktivitätseintrags fehlschlägt', async () => {
    mockPrismaEinsatzFindUnique.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
    });
    mockPrismaEinsatzUpdate.mockResolvedValue({
      id: 'einsatz-1',
      org_id: 'org-1',
      status_id: StatusValuePairs.vergeben_bestaetigt,
      title: 'Testeinsatz',
    });
    mockChangeTypeFindUnique.mockImplementation(
      async ({ where }: { where: { id?: string; name?: string } }) => {
        if (where.id === ChangeTypeIds['E-Bestaetigt']) {
          return { id: ChangeTypeIds['E-Bestaetigt'] };
        }
        return null;
      }
    );
    mockChangeLogCreate.mockRejectedValue(new Error('Insert fehlgeschlagen'));

    await expect(
      updateEinsatzStatus('einsatz-1', StatusValuePairs.vergeben_bestaetigt)
    ).rejects.toThrow('Insert fehlgeschlagen');
  });
});

describe('createEinsatz', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);
    mockRequireAuth.mockResolvedValue({
      session: {
        user: {
          id: 'user-1',
          orgIds: ['org-1'],
          activeOrganization: { id: 'org-1' },
        },
      },
      userIds: {
        userId: 'user-1',
        orgId: 'org-1',
        orgIds: ['org-1'],
      },
    });
    mockHasPermission.mockResolvedValue(true);
    mockCreate.mockResolvedValue({
      id: 'einsatz-1',
      title: 'Neuer Einsatz',
      org_id: 'org-1',
      created_by: 'user-1',
      start: new Date('2026-04-20T08:00:00.000Z'),
      end: new Date('2026-04-20T10:00:00.000Z'),
      helpers_needed: 1,
      participant_count: 20,
      price_per_person: 12.5,
      total_price: 250,
      anmerkung: 'Notiz',
      all_day: false,
    });
    mockPrismaEinsatzFindUnique.mockReset();
    mockPrismaEinsatzUpdate.mockReset();
    mockChangeTypeFindUnique.mockReset();
    mockChangeLogCreate.mockReset();
    mockConsoleWarn.mockReset();
  });

  it('speichert Anmerkung beim Erstellen eines Einsatzes', async () => {
    await createEinsatz({
      data: {
        title: 'Neuer Einsatz',
        start: new Date('2026-04-20T08:00:00.000Z'),
        end: new Date('2026-04-20T10:00:00.000Z'),
        org_id: 'org-1',
        created_by: 'user-1',
        helpers_needed: 1,
        participant_count: 20,
        price_per_person: 12.5,
        total_price: 250,
        categories: [],
        einsatz_fields: [],
        anmerkung: 'Notiz',
      },
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Neuer Einsatz',
        org_id: 'org-1',
        created_by: 'user-1',
        helpers_needed: 1,
        participant_count: 20,
        price_per_person: 12.5,
        total_price: 250,
        anmerkung: 'Notiz',
        all_day: false,
      }),
    });
  });
});
