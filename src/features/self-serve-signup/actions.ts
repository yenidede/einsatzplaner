'use server';

import {
  checkOrganizationNameAvailability,
  type OrganizationNameAvailabilityResult,
} from './organization-step';
import { organizationStepSchema, type OrganizationStepValues } from './schema';

export async function continueSelfServeSignup(
  input: OrganizationStepValues
): Promise<OrganizationNameAvailabilityResult> {
  const parsedInput = organizationStepSchema.parse(input);
  return checkOrganizationNameAvailability(parsedInput);
}
