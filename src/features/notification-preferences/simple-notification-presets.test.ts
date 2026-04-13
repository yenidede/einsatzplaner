import { describe, expect, it } from 'vitest';
import {
  applySimpleNotificationPreset,
  applyUrgentImmediateOverride,
  isUrgentImmediateEnabled,
  resolveSimpleNotificationPreset,
  type SimpleNotificationState,
} from './simple-notification-presets';

const baseState: SimpleNotificationState = {
  emailEnabled: true,
  deliveryMode: 'critical_and_digest',
  minimumPriority: 'review',
  digestInterval: 'daily',
  digestTime: '08:00',
  digestSecondTime: '16:00',
};

describe('simple-notification-presets', () => {
  it('leitet das einfache Preset aus Status und Mindestpriorität ab', () => {
    expect(
      resolveSimpleNotificationPreset({
        emailEnabled: false,
        minimumPriority: 'info',
      })
    ).toBe('none');

    expect(
      resolveSimpleNotificationPreset({
        emailEnabled: true,
        minimumPriority: 'review',
      })
    ).toBe('important');

    expect(
      resolveSimpleNotificationPreset({
        emailEnabled: true,
        minimumPriority: 'info',
      })
    ).toBe('digest');
  });

  it('setzt Presets auf konsistente Basiswerte', () => {
    expect(applySimpleNotificationPreset(baseState, 'none')).toMatchObject({
      emailEnabled: false,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'review',
    });

    expect(applySimpleNotificationPreset(baseState, 'important')).toMatchObject({
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'review',
    });

    expect(applySimpleNotificationPreset(baseState, 'digest')).toMatchObject({
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'info',
    });
  });

  it('aktiviert und deaktiviert die P1-Sofortregel', () => {
    expect(isUrgentImmediateEnabled('critical_and_digest')).toBe(true);
    expect(isUrgentImmediateEnabled('critical_only')).toBe(true);
    expect(isUrgentImmediateEnabled('digest_only')).toBe(false);

    expect(applyUrgentImmediateOverride(baseState, false).deliveryMode).toBe(
      'digest_only'
    );
    expect(applyUrgentImmediateOverride(baseState, true).deliveryMode).toBe(
      'critical_and_digest'
    );
  });
});
