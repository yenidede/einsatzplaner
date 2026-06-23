type OrganizationAccessInput = {
  subscription_status: string | null;
  trial_ends_at: Date | null;
};

export type OrganizationAccessDecision =
  | {
      status: 'usable';
      reason: 'active_subscription' | 'active_trial' | 'fallback_access';
    }
  | {
      status: 'expired';
      reason: 'manual_expired' | 'expired_trial';
    };

function normalizeSubscriptionStatus(
  subscriptionStatus: string | null | undefined
): string | null {
  const normalized = subscriptionStatus?.trim().toLowerCase();

  return normalized ? normalized : null;
}

export function getOrganizationAccessDecision(
  organization: OrganizationAccessInput,
  now: Date = new Date()
): OrganizationAccessDecision {
  const subscriptionStatus = normalizeSubscriptionStatus(
    organization.subscription_status
  );

  if (subscriptionStatus === 'active') {
    return {
      status: 'usable',
      reason: 'active_subscription',
    };
  }

  if (subscriptionStatus === 'expired') {
    return {
      status: 'expired',
      reason: 'manual_expired',
    };
  }

  if (subscriptionStatus === 'trial') {
    if (organization.trial_ends_at && organization.trial_ends_at < now) {
      return {
        status: 'expired',
        reason: 'expired_trial',
      };
    }

    return {
      status: 'usable',
      reason: 'active_trial',
    };
  }

  if (organization.trial_ends_at && organization.trial_ends_at < now) {
    return {
      status: 'expired',
      reason: 'expired_trial',
    };
  }

  return {
    status: 'usable',
    reason: 'fallback_access',
  };
}
