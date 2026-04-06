import prisma from '@/lib/prisma';
import {
  organizationStepSchema,
  type OrganizationStepValues,
} from './schema';

export interface OrganizationLookupClient {
  organization: {
    findFirst(args: {
      where: {
        name: {
          equals: string;
          mode: 'insensitive';
        };
      };
      select: {
        id: boolean;
      };
    }): Promise<{ id: string } | null>;
  };
}

export type OrganizationNameAvailabilityBlocker =
  | 'existing-organization'
  | 'foreign-pending-reservation';

export type OrganizationNameAvailabilityResult =
  | {
      status: 'available';
    }
  | {
      status: 'unavailable';
      message: string;
      blockers: OrganizationNameAvailabilityBlocker[];
    };

export interface OrganizationNameAvailabilityDependencies {
  db?: OrganizationLookupClient;
  findActiveForeignReservationByName?: (
    organizationName: string
  ) => Promise<boolean>;
}

function isOrganizationLookupClient(
  value: OrganizationLookupClient | OrganizationNameAvailabilityDependencies
): value is OrganizationLookupClient {
  return 'organization' in value;
}

export function getUnavailableOrganizationNameMessage(name: string) {
  return `Der Organisationsname "${name}" ist nicht verfügbar. Bitte ändern Sie ihn leicht und versuchen Sie es erneut.`;
}

export async function checkOrganizationNameAvailability(
  input: OrganizationStepValues,
  dependencies:
    | OrganizationLookupClient
    | OrganizationNameAvailabilityDependencies = prisma
): Promise<OrganizationNameAvailabilityResult> {
  const parsedInput = organizationStepSchema.parse(input);
  const organizationName = parsedInput.organizationName;
  const resolvedDependencies = isOrganizationLookupClient(dependencies)
    ? {
        db: dependencies,
        findActiveForeignReservationByName: undefined,
      }
    : {
        db: dependencies.db ?? prisma,
        findActiveForeignReservationByName:
          dependencies.findActiveForeignReservationByName,
      };

  const existingOrganization = await resolvedDependencies.db.organization.findFirst(
    {
      where: {
        name: {
          equals: organizationName,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    }
  );
  const hasActiveForeignReservation =
    await resolvedDependencies.findActiveForeignReservationByName?.(
      organizationName
    );
  const blockers: OrganizationNameAvailabilityBlocker[] = [];

  if (existingOrganization) {
    blockers.push('existing-organization');
  }

  if (hasActiveForeignReservation) {
    blockers.push('foreign-pending-reservation');
  }

  if (blockers.length > 0) {
    return {
      status: 'unavailable',
      message: getUnavailableOrganizationNameMessage(organizationName),
      blockers,
    };
  }

  return {
    status: 'available',
  };
}
