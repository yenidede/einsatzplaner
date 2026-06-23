/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationNotificationDefaultsForm } from './OrganizationNotificationDefaultsForm';

function renderForm(
  overrides?: Partial<ComponentProps<typeof OrganizationNotificationDefaultsForm>>
) {
  const baseProps: ComponentProps<typeof OrganizationNotificationDefaultsForm> = {
    organizationName: 'HAK Bregenz',
    emailEnabledDefault: true,
    deliveryModeDefault: 'critical_and_digest',
    minimumPriorityDefault: 'review',
    urgentDeliveryDefault: 'immediate',
    importantDeliveryDefault: 'immediate',
    generalDeliveryDefault: 'off',
    digestIntervalDefault: 'daily',
    digestTimeDefault: '08:00',
    digestSecondTimeDefault: '16:00',
    onEmailEnabledDefaultChange: vi.fn(),
    onDeliveryModeDefaultChange: vi.fn(),
    onMinimumPriorityDefaultChange: vi.fn(),
    onUrgentDeliveryDefaultChange: vi.fn(),
    onImportantDeliveryDefaultChange: vi.fn(),
    onGeneralDeliveryDefaultChange: vi.fn(),
    onDigestIntervalDefaultChange: vi.fn(),
    onDigestTimeDefaultChange: vi.fn(),
    onDigestSecondTimeDefaultChange: vi.fn(),
    disabled: false,
  };

  return render(
    <OrganizationNotificationDefaultsForm
      {...baseProps}
      {...overrides}
    />
  );
}

describe('OrganizationNotificationDefaultsForm', () => {
  it('zeigt die individuelle Matrix nur bei „Individuell“', () => {
    const onDeliveryModeDefaultChange = vi.fn();
    const onMinimumPriorityDefaultChange = vi.fn();

    renderForm({
      onDeliveryModeDefaultChange,
      onMinimumPriorityDefaultChange,
      urgentDeliveryDefault: 'digest',
      importantDeliveryDefault: 'digest',
      generalDeliveryDefault: 'off',
    });

    expect(screen.queryByText('Individuelle Benachrichtigungsregeln')).toBeTruthy();
    expect(screen.getByText('Dringende Meldungen')).toBeTruthy();
    expect(screen.getByText('Wichtige Meldungen')).toBeTruthy();
    expect(screen.getByText('Allgemeine Informationen')).toBeTruthy();
  });

  it('zeigt Digest-Felder im Digest-Preset', () => {
    renderForm({
      minimumPriorityDefault: 'info',
      urgentDeliveryDefault: 'immediate',
      importantDeliveryDefault: 'digest',
      generalDeliveryDefault: 'digest',
    });

    expect(screen.getByText('Häufigkeit')).toBeTruthy();
    expect(screen.getByText('Uhrzeit')).toBeTruthy();
    expect(screen.queryByText('Individuelle Benachrichtigungsregeln')).toBeNull();
  });

  it('rendert die Regeln als Radio-Auswahl unter dem Titel', () => {
    const onGeneralDeliveryDefaultChange = vi.fn();

    renderForm({
      urgentDeliveryDefault: 'digest',
      importantDeliveryDefault: 'digest',
      generalDeliveryDefault: 'digest',
      onGeneralDeliveryDefaultChange,
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Keine E-Mail' }));

    expect(onGeneralDeliveryDefaultChange).toHaveBeenCalledWith('off');
  });
});
