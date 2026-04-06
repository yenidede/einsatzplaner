'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import {
  checkOrganizationNameAvailability,
  type OrganizationNameAvailabilityResult,
} from './organization-step';
import { organizationStepSchema, type OrganizationStepValues } from './schema';
import {
  resolveSelfServeSignupAccountMode,
  type SelfServeSignupAccountMode,
} from './account-step';

export type ContinueSelfServeSignupResult =
  | OrganizationNameAvailabilityResult
  | {
      status: 'account-mode-resolved';
      accountMode: SelfServeSignupAccountMode;
      email: string;
    };

export async function continueSelfServeSignup(
  input: OrganizationStepValues
): Promise<ContinueSelfServeSignupResult> {
  const parsedInput = organizationStepSchema.parse(input);
  const organizationResult = await checkOrganizationNameAvailability(parsedInput);

  if (organizationResult.status === 'unavailable') {
    return organizationResult;
  }

  const session = await getServerSession(authOptions);
  const currentUserEmail = session?.user?.email ?? null;
  const accountMode = await resolveSelfServeSignupAccountMode(
    parsedInput.email,
    {
      currentUserEmail,
    }
  );

  return {
    status: 'account-mode-resolved',
    accountMode,
    email: currentUserEmail ?? parsedInput.email,
  };
}
