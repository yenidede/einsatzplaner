import { describe, expect, it } from 'vitest';
import {
  applySimpleNotificationPreset,
  resolveSimpleNotificationPreset,
  type SimpleNotificationState,
} from './simple-notification-presets';

const baseState: SimpleNotificationState = {
  emailEnabled: true,
  deliveryMode: 'critical_and_digest',
  minimumPriority: 'review',
  urgentDelivery: 'immediate',
  importantDelivery: 'immediate',
  generalDelivery: 'off',
  digestInterval: 'daily',
  digestTime: '08:00',
  digestSecondTime: '16:00',
};

describe('simple-notification-presets', () => {
  it('leitet Preset-Modus aus der effektiven Regelkombination ab', () => {
    expect(
      resolveSimpleNotificationPreset({
        emailEnabled: false,
        urgentDelivery: 'immediate',
        importantDelivery: 'immediate',
        generalDelivery: 'off',
      })
    ).toBe('important');

    expect(
      resolveSimpleNotificationPreset({
        emailEnabled: true,
        urgentDelivery: 'immediate',
        importantDelivery: 'immediate',
        generalDelivery: 'off',
      })
    ).toBe('important');

    expect(
      resolveSimpleNotificationPreset({
        emailEnabled: true,
        urgentDelivery: 'immediate',
        importantDelivery: 'digest',
        generalDelivery: 'digest',
      })
    ).toBe('digest');

    expect(
      resolveSimpleNotificationPreset({
        emailEnabled: true,
        urgentDelivery: 'digest',
        importantDelivery: 'digest',
        generalDelivery: 'digest',
      })
    ).toBe('individual');
  });

  it('setzt Presets auf konsistente Basiswerte', () => {
    expect(applySimpleNotificationPreset(baseState, 'important')).toMatchObject({
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'review',
      urgentDelivery: 'immediate',
      importantDelivery: 'immediate',
      generalDelivery: 'off',
    });

    expect(applySimpleNotificationPreset(baseState, 'digest')).toMatchObject({
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'info',
      urgentDelivery: 'immediate',
      importantDelivery: 'digest',
      generalDelivery: 'digest',
    });

    expect(applySimpleNotificationPreset(baseState, 'individual')).toMatchObject({
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'review',
    });
  });
});
