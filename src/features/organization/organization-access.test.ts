import { describe, expect, it } from 'vitest';
import { getOrganizationAccessDecision } from './organization-access';

describe('getOrganizationAccessDecision', () => {
  const now = new Date('2026-04-06T12:00:00.000Z');

  it('laesst aktive Subscriptions unabhaengig vom Trial-Ende zu', () => {
    expect(
      getOrganizationAccessDecision(
        {
          subscription_status: 'active',
          trial_ends_at: new Date('2026-04-01T12:00:00.000Z'),
        },
        now
      )
    ).toEqual({
      status: 'usable',
      reason: 'active_subscription',
    });
  });

  it('sperrt manuell als expired markierte Organisationen sofort', () => {
    expect(
      getOrganizationAccessDecision(
        {
          subscription_status: 'expired',
          trial_ends_at: new Date('2026-04-20T12:00:00.000Z'),
        },
        now
      )
    ).toEqual({
      status: 'expired',
      reason: 'manual_expired',
    });
  });

  it('laesst laufende Trials zu', () => {
    expect(
      getOrganizationAccessDecision(
        {
          subscription_status: 'trial',
          trial_ends_at: new Date('2026-04-20T12:00:00.000Z'),
        },
        now
      )
    ).toEqual({
      status: 'usable',
      reason: 'active_trial',
    });
  });

  it('sperrt abgelaufene Trials', () => {
    expect(
      getOrganizationAccessDecision(
        {
          subscription_status: 'trial',
          trial_ends_at: new Date('2026-04-05T12:00:00.000Z'),
        },
        now
      )
    ).toEqual({
      status: 'expired',
      reason: 'expired_trial',
    });
  });

  it('faellt fuer unbekannte Stati auf das explizite Trial-Ende zurueck', () => {
    expect(
      getOrganizationAccessDecision(
        {
          subscription_status: 'paused',
          trial_ends_at: new Date('2026-04-05T12:00:00.000Z'),
        },
        now
      )
    ).toEqual({
      status: 'expired',
      reason: 'expired_trial',
    });
  });

  it('laesst Organisationen ohne verwertbaren Status oder Ablaufdatum vorerst zu', () => {
    expect(
      getOrganizationAccessDecision(
        {
          subscription_status: null,
          trial_ends_at: null,
        },
        now
      )
    ).toEqual({
      status: 'usable',
      reason: 'fallback_access',
    });
  });
});
