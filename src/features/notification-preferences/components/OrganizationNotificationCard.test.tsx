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
    urgentDelivery: 'immediate',
    importantDelivery: 'immediate',
    generalDelivery: 'off',
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
          urgentDeliveryDefault: 'immediate',
          importantDeliveryDefault: 'immediate',
          generalDeliveryDefault: 'off',
          digestIntervalDefault: 'daily',
          digestTimeDefault: '08:00',
          digestSecondTimeDefault: '16:00',
        },
        preference: null,
        effective: {
          emailEnabled: true,
          deliveryMode: 'critical_and_digest',
          minimumPriority: 'review',
          urgentDelivery: 'immediate',
          importantDelivery: 'immediate',
          generalDelivery: 'off',
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
  it('zeigt Presets inkl. „Individuell“ und blendet die Matrix zunächst aus', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );

    expect(screen.getByText('Wie möchten Sie benachrichtigt werden?')).toBeTruthy();
    expect(screen.getByText('Nur wichtige Meldungen')).toBeTruthy();
    expect(screen.getByText('Alle Meldungen als Sammelmail')).toBeTruthy();
    expect(screen.getByText('Individuell')).toBeTruthy();
    expect(screen.queryByText('Individuelle Benachrichtigungsregeln')).toBeNull();
  });

  it('lässt Presets bei deaktivierter E-Mail sichtbar und zeigt deaktivierte Zusammenfassung', () => {
    const onDraftChange = vi.fn();
    renderCard(
      createDraft({
        emailEnabled: false,
      }),
      onDraftChange
    );

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );

    expect(
      screen.getByText(/E-Mail-Benachrichtigungen deaktiviert/)
    ).toBeTruthy();
    expect(screen.getByText('Nur wichtige Meldungen')).toBeTruthy();
    expect(screen.getByText('Alle Meldungen als Sammelmail')).toBeTruthy();
    expect(screen.getByText('Individuell')).toBeTruthy();
  });

  it('zeigt die Matrix nur im Modus „Individuell“', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );
    fireEvent.click(screen.getByText('Individuell'));

    expect(screen.getByText('Individuelle Benachrichtigungsregeln')).toBeTruthy();
    expect(screen.getByText('Dringende Meldungen')).toBeTruthy();
    expect(screen.getByText('Wichtige Meldungen')).toBeTruthy();
    expect(screen.getByText('Allgemeine Informationen')).toBeTruthy();
    expect(
      screen.getByText(
        'Die einfache Auswahl oben setzt eine Voreinstellung. Hier können Sie diese bei Bedarf anpassen.'
      )
    ).toBeTruthy();
  });

  it('schaltet beim Ändern der Matrix auf individuelle Regeln und schreibt den Entwurf um', () => {
    const onDraftChange = vi.fn();
    renderCard(
      createDraft({
        deliveryMode: 'critical_and_digest',
        minimumPriority: 'info',
        urgentDelivery: 'immediate',
        importantDelivery: 'digest',
        generalDelivery: 'digest',
      }),
      onDraftChange
    );

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );
    fireEvent.click(screen.getByText('Individuell'));
    fireEvent.click(screen.getAllByText('Keine E-Mail')[0]);

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        generalDelivery: 'off',
        deliveryMode: 'critical_and_digest',
      })
    );
  });

  it('zeigt bei nicht-preset-konformen Regeln eine individuelle Zusammenfassung', () => {
    const onDraftChange = vi.fn();
    renderCard(
      createDraft({
        urgentDelivery: 'immediate',
        importantDelivery: 'digest',
        generalDelivery: 'off',
      }),
      onDraftChange
    );

    expect(screen.getByText(/Individuell angepasst/)).toBeTruthy();
  });
});
