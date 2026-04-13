/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  OrganizationNotificationCard,
  type NotificationCardDraft,
} from './OrganizationNotificationCard';

function createDraft(
  overrides?: Partial<NotificationCardDraft>
): NotificationCardDraft {
  return {
    useOrganizationDefaults: false,
    emailEnabled: true,
    deliveryMode: 'critical_and_digest',
    minimumPriority: 'review',
    digestInterval: 'every_2_days',
    digestTime: '08:00',
    digestSecondTime: '16:00',
    ...overrides,
  };
}

function renderCard(
  draft: NotificationCardDraft,
  onDraftChange: (next: NotificationCardDraft) => void
) {
  render(
    <OrganizationNotificationCard
      card={{
        organizationId: 'org-1',
        organizationName: 'HAK Bregenz',
        defaults: {
          organizationId: 'org-1',
          emailEnabledDefault: true,
          deliveryModeDefault: 'critical_and_digest',
          minimumPriorityDefault: 'review',
          digestIntervalDefault: 'daily',
          digestTimeDefault: '08:00',
          digestSecondTimeDefault: '16:00',
        },
        preference: null,
        effective: {
          emailEnabled: true,
          deliveryMode: 'critical_and_digest',
          minimumPriority: 'review',
          digestInterval: 'daily',
          digestTime: '08:00',
          digestSecondTime: '16:00',
        },
        summary: '',
        source: 'organization',
      }}
      draft={draft}
      onDraftChange={onDraftChange}
    />
  );
}

describe('OrganizationNotificationCard', () => {
  it('zeigt die schlanke MVP-Struktur und hält erweiterte Einstellungen standardmäßig geschlossen', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );

    expect(screen.getByText('E-Mail-Benachrichtigungen')).toBeTruthy();
    expect(
      screen.getByText('Wie möchten Sie benachrichtigt werden?')
    ).toBeTruthy();
    expect(screen.getByText('Erweiterte Einstellungen')).toBeTruthy();
    expect(
      screen.queryByText('Dringende Meldungen immer sofort senden')
    ).toBeNull();
    expect(screen.queryByText('Änderungen speichern')).toBeNull();
    expect(screen.queryByText('Änderungen verwerfen')).toBeNull();
  });

  it('überschreibt im erweiterten Bereich die P1-Sofortregel', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );
    fireEvent.click(screen.getByText('Erweiterte Einstellungen'));
    fireEvent.click(
      screen.getByText('Dringende Meldungen immer sofort senden')
    );

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        deliveryMode: 'digest_only',
      })
    );
  });
});
