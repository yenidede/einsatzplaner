/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  OrganizationNotificationCard,
  type NotificationCardDraft,
} from './OrganizationNotificationCard';

describe('OrganizationNotificationCard', () => {
  it('zeigt keine eigenen Speichern/Verwerfen-Aktionen mehr in der Karte', () => {
    const draft: NotificationCardDraft = {
      useOrganizationDefaults: false,
      emailEnabled: true,
      deliveryMode: 'critical_and_digest',
      minimumPriority: 'review',
      digestInterval: 'every_2_days',
      digestTime: '08:00',
      digestSecondTime: '16:00',
    };

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
        onDraftChange={vi.fn()}
      />
    );

    expect(screen.queryByText('Änderungen speichern')).toBeNull();
    expect(screen.queryByText('Änderungen verwerfen')).toBeNull();
    expect(screen.getByText(/Eigene Einstellung:/)).toBeTruthy();
  });
});
