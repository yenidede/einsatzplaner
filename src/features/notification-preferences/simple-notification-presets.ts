import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  MinimumPriority,
} from './types';

export type SimpleNotificationPreset = 'none' | 'important' | 'digest';

export interface SimpleNotificationState {
  emailEnabled: boolean;
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
  digestInterval: DigestInterval;
  digestTime: DigestTime;
  digestSecondTime: DigestTime;
}

export function resolveSimpleNotificationPreset(
  state: Pick<SimpleNotificationState, 'emailEnabled' | 'minimumPriority'>
): SimpleNotificationPreset {
  if (!state.emailEnabled) {
    return 'none';
  }

  if (state.minimumPriority === 'info') {
    return 'digest';
  }

  return 'important';
}

export function applySimpleNotificationPreset<T extends SimpleNotificationState>(
  state: T,
  preset: SimpleNotificationPreset
): T {
  if (preset === 'none') {
    return {
      ...state,
      emailEnabled: false,
    };
  }

  if (preset === 'important') {
    return {
      ...state,
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'review',
    };
  }

  return {
    ...state,
    emailEnabled: true,
    deliveryMode: 'critical_and_digest',
    minimumPriority: 'info',
  };
}

export function isUrgentImmediateEnabled(
  deliveryMode: DeliveryMode
): boolean {
  return deliveryMode === 'critical_only' || deliveryMode === 'critical_and_digest';
}

export function applyUrgentImmediateOverride<T extends SimpleNotificationState>(
  state: T,
  enabled: boolean
): T {
  return {
    ...state,
    deliveryMode: enabled ? 'critical_and_digest' : 'digest_only',
  };
}
