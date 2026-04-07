import { differenceInCalendarDays } from 'date-fns';
import type { OrganizationAccessDecision } from '@/features/organization/organization-access';
import { isHelperOnlyOrganizationRole } from '@/features/organization/subscription-expired';

type TrialReminderInput = {
  accessDecision: OrganizationAccessDecision;
  trialEndsAt: Date | null;
  roleNames: string[];
};

export type TrialReminderContent = {
  daysRemaining: number;
  message: string;
};

export function formatTrialReminderMessage(daysRemaining: number): string {
  if (daysRemaining <= 0) {
    return 'Ihre Testphase endet heute.';
  }

  if (daysRemaining === 1) {
    return 'Ihre Testphase endet morgen.';
  }

  return `Ihre Testphase endet in ${daysRemaining} Tagen.`;
}

export function getTrialReminderContent(
  { accessDecision, trialEndsAt, roleNames }: TrialReminderInput,
  now: Date = new Date()
): TrialReminderContent | null {
  if (accessDecision.reason !== 'active_trial' || !trialEndsAt) {
    return null;
  }

  if (isHelperOnlyOrganizationRole(roleNames)) {
    return null;
  }

  const daysRemaining = Math.max(differenceInCalendarDays(trialEndsAt, now), 0);

  return {
    daysRemaining,
    message: formatTrialReminderMessage(daysRemaining),
  };
}
