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
  it('zeigt die Schnell-Umschaltung für E-Mails im Header und schaltet sie um', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    const emailSwitch = screen.getByRole('switch', {
      name: /E-Mail für HAK Bregenz deaktivieren/,
    });

    expect(emailSwitch).toBeTruthy();

    fireEvent.click(emailSwitch);

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        useOrganizationDefaults: false,
        emailEnabled: false,
      })
    );
  });

  it('zeigt Presets inkl. „Individuell“ und blendet die Matrix zunächst aus', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    expect(screen.getByText('Eigene Einstellung')).toBeTruthy();
    expect(screen.getByText('E-Mail aktiv')).toBeTruthy();
    expect(
      screen.getByText(
        /Dringende und wichtige Meldungen kommen sofort per E-Mail\.\s*Allgemeine Informationen werden nicht per E-Mail gesendet\./
      )
    ).toBeTruthy();

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );

    expect(
      screen.getByText('Wie möchten Sie benachrichtigt werden?')
    ).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'Nur wichtige Meldungen' })
    ).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'Alle Meldungen als Sammelmail' })
    ).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Individuell' })).toBeTruthy();
    expect(
      screen.queryByText('Individuelle Benachrichtigungsregeln')
    ).toBeNull();
  });

  it('schaltet über den Tab „Keine E-Mails“ auf deaktiviert', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Keine E-Mails' }));

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        useOrganizationDefaults: false,
        emailEnabled: false,
      })
    );
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

    expect(screen.getByText('E-Mail deaktiviert')).toBeTruthy();
    expect(screen.getByText('Sie erhalten keine E-Mails.')).toBeTruthy();
    expect(screen.getByText('Nur wichtige Meldungen')).toBeTruthy();
    expect(screen.getByText('Alle Meldungen als Sammelmail')).toBeTruthy();
    expect(screen.getByText('Individuell')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Keine E-Mails' })).toBeTruthy();
  });

  it('zeigt die Matrix nur im Modus „Individuell“', () => {
    const onDraftChange = vi.fn();
    renderCard(createDraft(), onDraftChange);

    fireEvent.click(
      screen.getAllByLabelText(/Details für HAK Bregenz anzeigen/)[0]
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Individuell' }));

    expect(
      screen.getByText('Individuelle Benachrichtigungsregeln')
    ).toBeTruthy();
    expect(screen.getByText('Dringende Meldungen')).toBeTruthy();
    expect(screen.getByText('Wichtige Meldungen')).toBeTruthy();
    expect(screen.getByText('Allgemeine Informationen')).toBeTruthy();
    expect(
      screen.getByText(
        'Oben wählen Sie eine einfache Voreinstellung. Hier können Sie für jede Meldungsstufe separat festlegen, ob Sie sofort, gesammelt oder gar nicht per E-Mail informiert werden möchten.'
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
    fireEvent.click(screen.getByRole('tab', { name: 'Individuell' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Keine E-Mail' }));

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

    expect(
      screen.getByText(
        /Eigene Regeln je Meldungsstufe\.\s*Sammelmails werden alle 2 Tage um 08:00 versendet\./
      )
    ).toBeTruthy();
  });

  it('kehrt über „Eigene Einstellung“ aus „Keine E-Mails“ zurück', () => {
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
    fireEvent.click(screen.getByRole('tab', { name: 'Eigene Einstellung' }));

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        useOrganizationDefaults: false,
        emailEnabled: true,
      })
    );
  });
});
