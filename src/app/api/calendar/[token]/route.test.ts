import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockCreateEvent,
  mockFindSubscription,
  mockFindEinsaetze,
  mockUpdateSubscription,
  mockFindUserOrgRoles,
} = vi.hoisted(() => ({
  mockCreateEvent: vi.fn(),
  mockFindSubscription: vi.fn(),
  mockFindEinsaetze: vi.fn(),
  mockUpdateSubscription: vi.fn(),
  mockFindUserOrgRoles: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    calendar_subscription: {
      findUnique: mockFindSubscription,
      update: mockUpdateSubscription,
    },
    einsatz: {
      findMany: mockFindEinsaetze,
    },
    user_organization_role: {
      findMany: mockFindUserOrgRoles,
    },
  },
}));

vi.mock('ical-generator', () => ({
  default: () => ({
    createEvent: mockCreateEvent,
    toString: () => 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n',
  }),
  ICalCalendarMethod: {
    PUBLISH: 'PUBLISH',
  },
  ICalEventStatus: {
    CONFIRMED: 'CONFIRMED',
  },
}));

import { GET } from './route';

describe('GET /api/calendar/[token]', () => {
  const previousNextAuthUrl = process.env.NEXTAUTH_URL;

  beforeEach(() => {
    process.env.NEXTAUTH_URL = 'https://einsatzplaner.example';
    mockCreateEvent.mockReset();
    mockFindSubscription.mockReset();
    mockFindEinsaetze.mockReset();
    mockUpdateSubscription.mockReset();
    mockFindUserOrgRoles.mockReset();

    mockFindSubscription.mockResolvedValue({
      user_id: 'user-1',
      org_id: 'orga-1',
      name: 'Mein Export',
      is_active: true,
      config: {
        version: 1,
        mode: 'helper',
        categoryIds: [],
        statusIds: [],
        statusPseudo: [],
        timeWindow: null,
        includeAllDay: true,
        futureOnly: false,
        titleAdditions: {
          categories: true,
          helperCount: true,
        },
      },
      organization: {
        name: 'Organisation',
        email: null,
        phone: null,
        helper_name_plural: 'Helfer:innen',
        einsatz_name_singular: 'Einsatz',
      },
    });
    mockFindEinsaetze.mockResolvedValue([
      {
        id: 'einsatz-1',
        title: 'Führung',
        start: new Date('2026-06-10T10:00:00.000Z'),
        end: new Date('2026-06-10T11:00:00.000Z'),
        all_day: false,
        anmerkung: null,
        helpers_needed: 2,
        participant_count: null,
        price_per_person: null,
        total_price: null,
        einsatz_to_category: [
          {
            category_id: 'cat-1',
            einsatz_category: {
              id: 'cat-1',
              value: 'Dauerausstellung',
              abbreviation: 'DA',
            },
          },
          {
            category_id: 'cat-2',
            einsatz_category: {
              id: 'cat-2',
              value: 'Veranstaltung',
              abbreviation: 'VA',
            },
          },
        ],
        einsatz_field: [],
        einsatz_user_property: [],
        einsatz_helper: [
          {
            user_id: 'user-1',
            user: {
              id: 'user-1',
              firstname: 'Erika',
              lastname: 'Musterfrau',
            },
          },
        ],
        status_id: 'status-1',
        einsatz_status: {
          id: 'status-1',
          helper_text: 'vergeben',
          verwalter_text: 'vergeben',
        },
        organization: {
          name: 'Organisation',
        },
      },
    ]);
    mockFindUserOrgRoles.mockResolvedValue([
      {
        role: {
          name: 'Helfer',
        },
      },
    ]);
    mockCreateEvent.mockReturnValue({
      uid: vi.fn(),
      organizer: vi.fn(),
    });
  });

  afterEach(() => {
    process.env.NEXTAUTH_URL = previousNextAuthUrl;
  });

  it('verwendet den Kalenderexport-Titel als Summary', async () => {
    await GET(
      new NextRequest('https://einsatzplaner.example/api/calendar/token'),
      {
        params: Promise.resolve({ token: 'token' }),
      }
    );

    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Führung (DA, VA · 1/2)',
      })
    );
  });

  it('exportiert eingeteilte Personen und offene Plätze im Summary', async () => {
    mockFindSubscription.mockResolvedValue({
      user_id: 'user-1',
      org_id: 'orga-1',
      name: 'Café Export',
      is_active: true,
      config: {
        version: 1,
        mode: 'helper',
        categoryIds: [],
        statusIds: [],
        statusPseudo: [],
        timeWindow: null,
        includeAllDay: true,
        futureOnly: false,
        titleAdditions: {
          eventTitle: true,
          assignedHelperNames: true,
          categories: false,
          helperCount: true,
        },
      },
      organization: {
        name: 'Organisation',
        email: null,
        phone: null,
        helper_name_plural: 'Helfer:innen',
        einsatz_name_singular: 'Einsatz',
      },
    });
    mockFindEinsaetze.mockResolvedValue([
      {
        id: 'einsatz-1',
        title: 'Kassa/Café',
        start: new Date('2026-06-18T10:00:00.000Z'),
        end: new Date('2026-06-18T11:00:00.000Z'),
        all_day: false,
        anmerkung: null,
        helpers_needed: 2,
        participant_count: null,
        price_per_person: null,
        total_price: null,
        einsatz_to_category: [],
        einsatz_field: [],
        einsatz_user_property: [],
        einsatz_helper: [
          {
            user_id: 'user-1',
            user: {
              id: 'user-1',
              firstname: 'Raphael',
              lastname: 'Muster',
            },
          },
        ],
        status_id: 'status-1',
        einsatz_status: {
          id: 'status-1',
          helper_text: 'teilweise vergeben',
          verwalter_text: 'teilweise vergeben',
        },
        organization: {
          name: 'Organisation',
        },
      },
    ]);

    await GET(
      new NextRequest('https://einsatzplaner.example/api/calendar/token'),
      {
        params: Promise.resolve({ token: 'token' }),
      }
    );

    expect(mockFindEinsaetze).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          einsatz_helper: expect.objectContaining({
            orderBy: { joined_at: 'asc' },
          }),
        }),
      })
    );
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Raphael + 1 | Kassa/Café (1/2)',
      })
    );
  });
});
