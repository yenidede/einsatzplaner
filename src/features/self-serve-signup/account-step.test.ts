import { describe, expect, it, vi } from 'vitest';
import {
  resolveSelfServeSignupAccountMode,
  type AccountLookupClient,
} from './account-step';

describe('resolveSelfServeSignupAccountMode', () => {
  it('überspringt den Kontoschritt für bereits authentifizierte Nutzer', async () => {
    const db: AccountLookupClient = {
      user: {
        findFirst: vi.fn(),
      },
    };

    await expect(
      resolveSelfServeSignupAccountMode('neu@example.com', {
        currentUserEmail: 'angemeldet@example.com',
        db,
      })
    ).resolves.toBe('authenticated-user');

    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it('erkennt bestehende E-Mails serverseitig', async () => {
    const db: AccountLookupClient = {
      user: {
        findFirst: vi.fn().mockResolvedValue({ id: 'user-1' }),
      },
    };

    await expect(
      resolveSelfServeSignupAccountMode('  bestand@example.com  ', { db })
    ).resolves.toBe('existing-account');

    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: {
        email: {
          equals: 'bestand@example.com',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('liefert für neue E-Mails den Registrierungsmodus', async () => {
    const db: AccountLookupClient = {
      user: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      resolveSelfServeSignupAccountMode('neu@example.com', { db })
    ).resolves.toBe('new-account');
  });
});
