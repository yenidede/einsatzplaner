import type {
  DeliveryMode,
  DigestInterval,
  DigestTime,
  MinimumPriority,
} from './types';

export type SimpleNotificationPreset = 'important' | 'digest' | 'individual';

export interface SimpleNotificationState {
  emailEnabled: boolean;
  deliveryMode: DeliveryMode;
  minimumPriority: MinimumPriority;
  urgentDelivery: 'immediate' | 'digest';
  importantDelivery: 'immediate' | 'digest';
  generalDelivery: 'digest' | 'off';
  digestInterval: DigestInterval;
  digestTime: DigestTime;
  digestSecondTime: DigestTime;
}

function matchesImportantPreset(
  state: Pick<
    SimpleNotificationState,
    'urgentDelivery' | 'importantDelivery' | 'generalDelivery'
  >
): boolean {
  return (
    state.urgentDelivery === 'immediate' &&
    state.importantDelivery === 'immediate' &&
    state.generalDelivery === 'off'
  );
}

function matchesDigestPreset(
  state: Pick<
    SimpleNotificationState,
    'urgentDelivery' | 'importantDelivery' | 'generalDelivery'
  >
): boolean {
  return (
    state.urgentDelivery === 'immediate' &&
    state.importantDelivery === 'digest' &&
    state.generalDelivery === 'digest'
  );
}

export function resolveSimpleNotificationPreset(
  state: Pick<
    SimpleNotificationState,
    | 'emailEnabled'
    | 'urgentDelivery'
    | 'importantDelivery'
    | 'generalDelivery'
  >
): SimpleNotificationPreset {
  if (!state.emailEnabled) {
    return 'important';
  }

  if (matchesImportantPreset(state)) {
    return 'important';
  }

  if (matchesDigestPreset(state)) {
    return 'digest';
  }

  return 'individual';
}

export function applySimpleNotificationPreset<T extends SimpleNotificationState>(
  state: T,
  preset: SimpleNotificationPreset
): T {
  if (preset === 'important') {
    return {
      ...state,
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'review',
      urgentDelivery: 'immediate',
      importantDelivery: 'immediate',
      generalDelivery: 'off',
    };
  }

  if (preset === 'digest') {
    return {
      ...state,
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'info',
      urgentDelivery: 'immediate',
      importantDelivery: 'digest',
      generalDelivery: 'digest',
    };
  }

  return {
    ...state,
    emailEnabled: true,
  };
}

