import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailService } from './EmailService';

const sendMail = vi.fn(async () => ({ messageId: 'test-message-id' }));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail,
    })),
  },
}));

describe('EmailService', () => {
  beforeEach(() => {
    sendMail.mockReset();
    process.env.SMTP_USER = 'mailer@example.com';
    process.env.SMTP_PASS = 'secret';
  });

  it('schreibt neue Digest-Intervalle korrekt in die Sammelmail', async () => {
    const service = new EmailService();

    await service.sendNotificationDigestEmail({
      recipientEmail: 'person@example.com',
      recipientName: 'Max Mustermann',
      organizationName: 'HAK Bregenz',
      digestInterval: 'every_5_days',
      entries: [
        {
          einsatzTitle: 'Dienst',
          einsatzStart: new Date('2026-04-15T08:00:00.000Z'),
          warningLines: ['Hinweis'],
          einsatzUrl: 'https://example.com/einsaetze/1',
        },
      ],
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('alle 5 Tage'),
      })
    );
  });
});
