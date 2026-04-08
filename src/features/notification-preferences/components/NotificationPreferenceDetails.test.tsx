/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationPreferenceDetails } from './NotificationPreferenceDetails';

describe('NotificationPreferenceDetails', () => {
  it('zeigt bei aktiver Sammelmail genau ein Feld für die Versandzeit', () => {
    render(
      <NotificationPreferenceDetails
        idPrefix="test-notification"
        emailEnabled={true}
        deliveryMode="digest_only"
        minimumPriority="review"
        digestInterval="every_2_days"
        digestTime="08:00"
        digestSecondTime="16:00"
        onDeliveryModeChange={vi.fn()}
        onMinimumPriorityChange={vi.fn()}
        onDigestIntervalChange={vi.fn()}
        onDigestTimeChange={vi.fn()}
        onDigestSecondTimeChange={vi.fn()}
      />
    );

    expect(screen.getByText('Wie oft soll die Sammelmail gesendet werden?')).toBeTruthy();
    expect(screen.getByText('Versandzeit für Sammelmail')).toBeTruthy();
    expect(screen.queryByText('Zweite Versandzeit')).toBeNull();
  });

  it('zeigt Versandintervall-Feld nicht bei reinen Sofortmeldungen', () => {
    render(
      <NotificationPreferenceDetails
        idPrefix="test-notification"
        emailEnabled={true}
        deliveryMode="critical_only"
        minimumPriority="critical"
        digestInterval="daily"
        digestTime="08:00"
        digestSecondTime="16:00"
        onDeliveryModeChange={vi.fn()}
        onMinimumPriorityChange={vi.fn()}
        onDigestIntervalChange={vi.fn()}
        onDigestTimeChange={vi.fn()}
        onDigestSecondTimeChange={vi.fn()}
      />
    );

    expect(
      screen.queryByText('Wie oft soll die Sammelmail gesendet werden?')
    ).toBeNull();
  });
});
