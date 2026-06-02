import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockCreateEvent,
  mockFindSubscription,
  mockFindEinsaetze,
  mockUpdateSubscription,
} = vi.hoisted(() => ({
  mockCreateEvent: vi.fn(),
  mockFindSubscription: vi.fn(),
  mockFindEinsaetze: vi.fn(),
  mockUpdateSubscription: vi.fn(),
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

    mockFindSubscription.mockResolvedValue({
      org_id: 'orga-1',
      is_active: true,
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
            einsatz_category: {
              value: 'Dauerausstellung',
              abbreviation: 'DA',
            },
          },
          {
            einsatz_category: {
              value: 'Veranstaltung',
              abbreviation: 'VA',
            },
          },
        ],
        einsatz_field: [],
        einsatz_user_property: [],
        einsatz_helper: [
          {
            user: {
              firstname: 'Erika',
              lastname: 'Musterfrau',
            },
          },
        ],
        einsatz_status: null,
        organization: {
          name: 'Organisation',
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

  it('verwendet den In-App-Kalendertitel als Summary', async () => {
    await GET(
      new NextRequest('https://einsatzplaner.example/api/calendar/token'),
      {
        params: Promise.resolve({ token: 'token' }),
      }
    );

    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: 'Führung (DA, VA) (1/2)',
      })
    );
  });
});
