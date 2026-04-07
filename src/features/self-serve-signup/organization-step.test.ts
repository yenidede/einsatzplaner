import { describe, expect, it, vi } from 'vitest';
import {
  checkOrganizationNameAvailability,
  getUnavailableOrganizationNameMessage,
  type OrganizationNameAvailabilityDependencies,
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
          email: 'test@example.com',
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
        email: 'test@example.com',
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
          email: 'test@example.com',
        },
        db
      )
    ).resolves.toEqual({
      status: 'unavailable',
      message: getUnavailableOrganizationNameMessage('Testverein'),
      blockers: ['existing-organization'],
    });
  });

  it('meldet auch aktive fremde Reservierungen als nicht verfügbar', async () => {
    const db: OrganizationLookupClient = {
      organization: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const dependencies: OrganizationNameAvailabilityDependencies = {
      db,
      findActiveForeignReservationByName: vi.fn().mockResolvedValue(true),
    };

    await expect(
      checkOrganizationNameAvailability(
        {
          organizationName: 'Reservierter Verein',
          organizationDescription: '',
          email: 'test@example.com',
        },
        dependencies
      )
    ).resolves.toEqual({
      status: 'unavailable',
      message: getUnavailableOrganizationNameMessage('Reservierter Verein'),
      blockers: ['foreign-pending-reservation'],
    });

    expect(dependencies.findActiveForeignReservationByName).toHaveBeenCalledWith(
      'Reservierter Verein'
    );
  });
});
