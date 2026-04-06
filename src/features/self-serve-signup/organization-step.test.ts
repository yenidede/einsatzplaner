import { describe, expect, it, vi } from 'vitest';
import {
  checkOrganizationNameAvailability,
  getUnavailableOrganizationNameMessage,
  type OrganizationLookupClient,
} from './organization-step';

describe('checkOrganizationNameAvailability', () => {
  it('meldet freie Organisationsnamen als verfügbar', async () => {
    const db: OrganizationLookupClient = {
      organization: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      checkOrganizationNameAvailability(
        {
          organizationName: 'Testverein',
          organizationDescription: '',
        },
        db
      )
    ).resolves.toEqual({
      status: 'available',
    });

    expect(db.organization.findFirst).toHaveBeenCalledWith({
      where: {
        name: {
          equals: 'Testverein',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('trimmt den Namen vor der serverseitigen Verfügbarkeitsprüfung', async () => {
    const db: OrganizationLookupClient = {
      organization: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await checkOrganizationNameAvailability(
      {
        organizationName: '  Testverein  ',
        organizationDescription: '',
      },
      db
    );

    expect(db.organization.findFirst).toHaveBeenCalledWith({
      where: {
        name: {
          equals: 'Testverein',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('liefert die abgestimmte Meldung für bereits vergebene Namen', async () => {
    const db: OrganizationLookupClient = {
      organization: {
        findFirst: vi.fn().mockResolvedValue({ id: 'org-1' }),
      },
    };

    await expect(
      checkOrganizationNameAvailability(
        {
          organizationName: 'Testverein',
          organizationDescription: 'Probe',
        },
        db
      )
    ).resolves.toEqual({
      status: 'unavailable',
      message: getUnavailableOrganizationNameMessage('Testverein'),
    });
  });
});
