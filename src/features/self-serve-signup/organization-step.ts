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

export type OrganizationNameAvailabilityResult =
  | {
      status: 'available';
    }
  | {
      status: 'unavailable';
      message: string;
    };

export function getUnavailableOrganizationNameMessage(name: string) {
  return `Der Organisationsname "${name}" ist nicht verfügbar. Bitte ändern Sie ihn leicht und versuchen Sie es erneut.`;
}

export async function checkOrganizationNameAvailability(
  input: OrganizationStepValues,
  db: OrganizationLookupClient = prisma
): Promise<OrganizationNameAvailabilityResult> {
  const parsedInput = organizationStepSchema.parse(input);
  const organizationName = parsedInput.organizationName;

  const existingOrganization = await db.organization.findFirst({
    where: {
      name: {
        equals: organizationName,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  });

  if (existingOrganization) {
    return {
      status: 'unavailable',
      message: getUnavailableOrganizationNameMessage(organizationName),
    };
  }

  return {
    status: 'available',
  };
}
