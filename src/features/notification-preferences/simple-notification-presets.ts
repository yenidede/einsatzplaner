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
  // Intentional UI fallback: when E-Mail is disabled we keep the default preset
  // selection on "important", while the separate master toggle conveys "aus".
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

  // "Individuell" ist kein eigenes Mapping, sondern bewahrt die aktuell
  // gewählten Regelkanäle und stellt nur sicher, dass E-Mail aktiviert ist.
  return {
    ...state,
    emailEnabled: true,
  };
}

