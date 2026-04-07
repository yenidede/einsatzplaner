/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationPreferenceDetails } from './NotificationPreferenceDetails';

describe('NotificationPreferenceDetails', () => {
  it('zeigt bei 2x täglich links das Intervall und rechts zwei Zeitfelder', () => {
    render(
      <NotificationPreferenceDetails
        idPrefix="test-notification"
        emailEnabled={true}
        deliveryMode="digest_only"
        minimumPriority="review"
        digestInterval="twice_daily"
        digestTime="08:00"
        digestSecondTime="20:00"
        onDeliveryModeChange={vi.fn()}
        onMinimumPriorityChange={vi.fn()}
        onDigestIntervalChange={vi.fn()}
        onDigestTimeChange={vi.fn()}
        onDigestSecondTimeChange={vi.fn()}
      />
    );

    const intervalLabel = screen.getByText(
      'Wie oft soll die Sammelmail gesendet werden?'
    );
    const intervalContainer = intervalLabel.parentElement;
    const digestRowGrid = intervalContainer?.parentElement;

    expect(digestRowGrid).toBeTruthy();
    expect(digestRowGrid?.className).toContain('md:grid-cols-2');

    const secondTimeLabel = screen.getByText('Zweite Versandzeit für Sammelmail');
    const secondTimeContainer = secondTimeLabel.parentElement;
    const rightHalfGrid = secondTimeContainer?.parentElement;

    expect(rightHalfGrid).toBeTruthy();
    expect(rightHalfGrid?.className).toContain('md:grid-cols-2');
  });

  it('zeigt bei 1x täglich kein zweites Zeitfeld', () => {
    render(
      <NotificationPreferenceDetails
        idPrefix="test-notification"
        emailEnabled={true}
        deliveryMode="digest_only"
        minimumPriority="review"
        digestInterval="daily"
        digestTime="08:00"
        digestSecondTime="20:00"
        onDeliveryModeChange={vi.fn()}
        onMinimumPriorityChange={vi.fn()}
        onDigestIntervalChange={vi.fn()}
        onDigestTimeChange={vi.fn()}
        onDigestSecondTimeChange={vi.fn()}
      />
    );

    expect(
      screen.queryByText('Zweite Versandzeit für Sammelmail')
    ).toBeNull();
  });
});
