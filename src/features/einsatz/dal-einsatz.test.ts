import { Prisma } from '@/generated/prisma';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireAuth,
  mockHasPermission,
  mockCreateChangeLogAuto,
  mockCreateChangeLog,
  mockCheckEinsatzRequirementsAfterAssignment,
  mockTransaction,
  mockFindUnique,
  mockUpdate,
  mockFindManyConflicts,
  mockPrismaEinsatzFindUnique,
  mockPrismaEinsatzUpdate,
  mockChangeTypeFindUnique,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(),
  mockHasPermission: vi.fn(),
  mockCreateChangeLogAuto: vi.fn(),
  mockCreateChangeLog: vi.fn(),
  mockCheckEinsatzRequirementsAfterAssignment: vi.fn(),
  mockTransaction: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindManyConflicts: vi.fn(),
  mockPrismaEinsatzFindUnique: vi.fn(),
  mockPrismaEinsatzUpdate: vi.fn(),
  mockChangeTypeFindUnique: vi.fn(),
}));

vi.mock('@/lib/auth/authGuard', () => ({
  requireAuth: mockRequireAuth,
  hasPermission: mockHasPermission,
}));

vi.mock('@/features/activity_log/activity_log-dal', () => ({
  createChangeLogAuto: mockCreateChangeLogAuto,
  createChangeLog: mockCreateChangeLog,
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
      update: mockPrismaEinsatzUpdate,
    },
    change_type: {
      findUnique: mockChangeTypeFindUnique,
    },
    einsatz_helper: {
      findMany: mockFindManyConflicts,
    },
  },
}));

import { ChangeTypeIds } from '@/features/activity_log/changeTypeIds';
import { StatusValuePairs } from '@/components/event-calendar/constants';
import { toggleUserAssignmentToEinsatz, updateEinsatzStatus } from './dal-einsatz';

describe('toggleUserAssignmentToEinsatz', () => {
  beforeEach(() => {
    let assigned = false;

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
    mockCreateChangeLog.mockResolvedValue(undefined);
    mockCheckEinsatzRequirementsAfterAssignment.mockResolvedValue(undefined);
    mockFindManyConflicts.mockResolvedValue([]);
    mockPrismaEinsatzFindUnique.mockReset();
    mockPrismaEinsatzUpdate.mockReset();
    mockChangeTypeFindUnique.mockReset();

    mockFindUnique.mockImplementation(async (_args?: { select?: object }) => {
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
    mockCreateChangeLog.mockReset();
    mockPrismaEinsatzFindUnique.mockReset();
    mockPrismaEinsatzUpdate.mockReset();
    mockChangeTypeFindUnique.mockReset();
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

    expect(mockCreateChangeLog).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      userId: 'user-1',
      typeId: ChangeTypeIds['E-Bestaetigt'],
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

    expect(mockCreateChangeLog).toHaveBeenCalledWith({
      einsatzId: 'einsatz-1',
      userId: 'user-1',
      typeId: 'fallback-type-id',
    });
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

    expect(mockCreateChangeLog).not.toHaveBeenCalled();
    expect(mockChangeTypeFindUnique).not.toHaveBeenCalled();
  });
});
