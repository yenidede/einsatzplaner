import { resolveNotificationEmailDelivery } from '@/features/notification-preferences/notification-email-routing';
import type {
  DigestInterval,
  DigestTime,
  EffectiveNotificationSettings,
} from '@/features/notification-preferences/types';

export type WarningRecipient = {
  userId: string;
  email: string;
  name: string;
};

export type RoutedWarningRecipients = {
  immediateRecipients: Array<{ email: string; name: string }>;
  digestRecipients: Array<{
    userId: string;
    email: string;
    name: string;
    digestInterval: DigestInterval;
    digestTime: DigestTime;
    digestSecondTime: DigestTime;
  }>;
};

export function splitWarningRecipientsByDelivery(input: {
  recipients: WarningRecipient[];
  settingsByUserId: Map<string, EffectiveNotificationSettings>;
}): RoutedWarningRecipients {
  const { recipients, settingsByUserId } = input;
  const immediateRecipients: Array<{ email: string; name: string }> = [];
  const digestRecipients: Array<{
    userId: string;
    email: string;
    name: string;
    digestInterval: DigestInterval;
    digestTime: DigestTime;
    digestSecondTime: DigestTime;
  }> = [];

  for (const recipient of recipients) {
    const settings = settingsByUserId.get(recipient.userId);
    if (!settings) {
      console.warn(
        `[email-warning-routing] Fehlende Benachrichtigungseinstellungen für userId=${recipient.userId}; Fallback auf Sofortversand.`
      );
      immediateRecipients.push({
        email: recipient.email,
        name: recipient.name,
      });
      continue;
    }

    const delivery = resolveNotificationEmailDelivery({
      effective: settings,
      eventPriority: 'critical',
    });

    if (delivery === 'immediate') {
      immediateRecipients.push({
        email: recipient.email,
        name: recipient.name,
      });
      continue;
    }

    if (delivery === 'digest') {
      digestRecipients.push({
        userId: recipient.userId,
        email: recipient.email,
        name: recipient.name,
        digestInterval: settings.digestInterval,
        digestTime: settings.digestTime,
        digestSecondTime: settings.digestSecondTime,
      });
    }
  }

  return {
    immediateRecipients,
    digestRecipients,
  };
}
