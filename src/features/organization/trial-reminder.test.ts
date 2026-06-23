import { describe, expect, it } from 'vitest';
import { getTrialReminderContent } from './trial-reminder';

describe('getTrialReminderContent', () => {
  it('versteckt den Hinweis fuer helper-only Nutzer', () => {
    const reminder = getTrialReminderContent(
      {
        accessDecision: { status: 'usable', reason: 'active_trial' },
        trialEndsAt: new Date('2026-04-10T12:00:00.000Z'),
        roleNames: ['Helfer'],
      },
      new Date('2026-04-08T08:00:00.000Z')
    );

    expect(reminder).toBeNull();
  });

  it('zeigt fuer gemischte Rollen die verbleibenden Tage an', () => {
    const reminder = getTrialReminderContent(
      {
        accessDecision: { status: 'usable', reason: 'active_trial' },
        trialEndsAt: new Date('2026-04-10T12:00:00.000Z'),
        roleNames: ['Helfer', 'Superadmin'],
      },
      new Date('2026-04-08T08:00:00.000Z')
    );

    expect(reminder).toEqual({
      daysRemaining: 2,
      message: 'Ihre Testphase endet in 2 Tagen.',
    });
  });

  it('zeigt am letzten Tag den heute-Text an', () => {
    const reminder = getTrialReminderContent(
      {
        accessDecision: { status: 'usable', reason: 'active_trial' },
        trialEndsAt: new Date('2026-04-10T18:00:00.000Z'),
        roleNames: ['Superadmin'],
      },
      new Date('2026-04-10T08:00:00.000Z')
    );

    expect(reminder).toEqual({
      daysRemaining: 0,
      message: 'Ihre Testphase endet heute.',
    });
  });

  it('zeigt keinen Hinweis ausserhalb eines aktiven Trials', () => {
    const reminder = getTrialReminderContent(
      {
        accessDecision: { status: 'usable', reason: 'active_subscription' },
        trialEndsAt: new Date('2026-04-10T12:00:00.000Z'),
        roleNames: ['Superadmin'],
      },
      new Date('2026-04-08T08:00:00.000Z')
    );

    expect(reminder).toBeNull();
  });
});
