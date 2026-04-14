import nodemailer from 'nodemailer';
import type { DigestInterval } from '@/features/notification-preferences/types';

function buildDigestIntervalLabel(digestInterval: DigestInterval): string {
  if (digestInterval === 'daily') {
    return 'täglich';
  }

  if (digestInterval === 'every_2_days') {
    return 'alle 2 Tage';
  }

  if (digestInterval === 'every_3_days') {
    return 'alle 3 Tage';
  }

  if (digestInterval === 'every_5_days') {
    return 'alle 5 Tage';
  }

  if (digestInterval === 'every_7_days') {
    return 'alle 7 Tage';
  }

  return 'täglich';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toSafeEmailUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return '#';
    }

    return encodeURI(url.toString());
  } catch {
    return '#';
  }
}

export class EmailService {
  private transporter: nodemailer.Transporter | null;

  constructor() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn(
        'E-Mail-Service ist nicht konfiguriert. E-Mails werden in der Konsole ausgegeben.'
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true,
      logger: true,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    if (!this.transporter) {
      return;
    }

    const mailOptions = {
      from: `"Einsatzplaner" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Passwort zurücksetzen - Einsatzplaner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Passwort zurücksetzen</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Hallo,</p>
            
            <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für den Einsatzplaner gestellt.</p>
            
            <p>Klicken Sie auf den folgenden Link, um Ihr Passwort zurückzusetzen:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Passwort zurücksetzen
              </a>
            </div>
            
            <p>Falls der Button nicht funktioniert, können Sie den folgenden Link kopieren und in Ihren Browser einfügen:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p><strong>Wichtig:</strong> Dieser Link ist nur 1 Stunde gültig.</p>
            
            <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center;">
            Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendOneTimePasswordEmail(email: string, code: string, expiresAt: Date) {
    if (!this.transporter) {
      return;
    }

    const expiresAtText = expiresAt.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const mailOptions = {
      from: `"Einsatzplaner" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Ihr Bestätigungscode für Einsatzplaner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">E-Mail-Adresse bestätigen</h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Hallo,</p>

            <p>bitte geben Sie den folgenden 6-stelligen Bestätigungscode im Einsatzplaner ein:</p>

            <div style="margin: 24px 0; text-align: center;">
              <div style="display: inline-block; letter-spacing: 0.35em; font-size: 32px; font-weight: 700; color: #111827; background: white; padding: 16px 20px; border-radius: 10px; border: 1px solid #d1d5db;">
                ${escapeHtml(code)}
              </div>
            </div>

            <p>Der Code ist bis <strong>${escapeHtml(expiresAtText)} Uhr</strong> gültig.</p>
            <p>Falls Sie diese Anfrage nicht ausgelöst haben, können Sie diese E-Mail ignorieren.</p>
          </div>

          <p style="color: #666; font-size: 12px; text-align: center;">
            Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendInvitationEmail(
    email: string,
    inviterName: string,
    organizationName: string,
    token: string
  ) {
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;

    if (!this.transporter) {
      return;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">Einladung zur Organisation</h1>
          <h2 style="color: #0066cc; margin: 10px 0 0 0;">${organizationName}</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 20px 0;">
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
            Hallo,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
            <strong>${inviterName}</strong> hat Sie zur Organisation 
            <strong>"${organizationName}"</strong> im Einsatzplaner eingeladen.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
            Klicken Sie auf den Button unten, um die Einladung anzunehmen und Ihr Konto zu erstellen:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background: linear-gradient(135deg, #0066cc 0%, #004499 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 8px; display: inline-block; font-weight: bold;
                      font-size: 16px; box-shadow: 0 4px 15px rgba(0,102,204,0.3);">
              Einladung annehmen
            </a>
          </div>
          
          <div style="background: #e9ecef; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6c757d;">
              <strong>Falls der Button nicht funktioniert:</strong><br>
              Kopieren Sie diesen Link in Ihren Browser:
            </p>
            <p style="word-break: break-all; color: #0066cc; margin: 10px 0 0 0; font-size: 14px;">
              ${inviteUrl}
            </p>
          </div>
          
          <div style="border-left: 4px solid #ffc107; padding-left: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Wichtig:</strong> Diese Einladung läuft in 7 Tagen ab.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <h3 style="color: #333; margin: 0 0 15px 0;">Was ist der Einsatzplaner?</h3>
          <p style="color: #6c757d; font-size: 14px; line-height: 1.5; margin: 0;">
            Eine moderne Plattform für die Verwaltung und Koordination Ihrer Teams.
            Behalten Sie den Überblick über alle Aktivitäten.
          </p>
        </div>
        
        <div style="border-top: 1px solid #e9ecef; margin-top: 30px; padding-top: 20px; text-align: center;">
          <p style="color: #6c757d; font-size: 12px; margin: 0;">
            Diese E-Mail wurde automatisch generiert. Falls Sie diese Einladung nicht erwartet haben,
            können Sie diese E-Mail ignorieren.
          </p>
          <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
            ${new Date().getFullYear()} Einsatzplaner - Alle Rechte vorbehalten
          </p>
        </div>
      </div>
    `;

    try {
      const mailOptions = {
        from: `"${organizationName} via Einsatzplaner" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Einladung zur Organisation "${organizationName}"`,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Fehler beim Senden der Einladungs-E-Mail:', error);
      throw new Error(
        `E-Mail-Versand fehlgeschlagen: ${
          error instanceof Error ? error.message : 'Unbekannter Fehler'
        }`
      );
    }
  }

  async sendInvitationReminderEmail(
    recipientEmail: string,
    inviterName: string,
    organizationName: string,
    token: string,
    expiresAt: Date
  ) {
    const acceptUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;

    const expiryDate = expiresAt.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!this.transporter) {
      return;
    }

    const mailOptions = {
      from: `"${organizationName} via Einsatzplaner" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `Erinnerung: Einladung zu ${organizationName} läuft bald ab`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
              .content { padding: 20px 0; }
              .button { 
                display: inline-block; 
                padding: 12px 30px; 
                background: #007bff; 
                color: white; 
                text-decoration: none; 
                border-radius: 5px;
                margin: 20px 0;
              }
              .warning {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                margin: 20px 0;
              }
              .footer { 
                margin-top: 30px; 
                padding-top: 20px; 
                border-top: 1px solid #ddd; 
                font-size: 12px; 
                color: #666; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Erinnerung: Ihre Einladung läuft bald ab</h2>
              </div>
              
              <div class="content">
                <p>Hallo,</p>
                
                <div class="warning">
                  <strong>Wichtig:</strong> Ihre Einladung zu <strong>${organizationName}</strong> 
                  läuft am <strong>${expiryDate}</strong> ab.
                </div>
                
                <p>${inviterName} hat Sie eingeladen, der Organisation <strong>${organizationName}</strong> beizutreten.</p>
                
                <p>Wenn Sie die Einladung annehmen möchten, klicken Sie bitte auf den folgenden Link:</p>
                
                <div style="text-align: center;">
                  <a href="${acceptUrl}" class="button">
                    Einladung jetzt annehmen
                  </a>
                </div>
                
                <p style="margin-top: 30px;">
                  Oder kopieren Sie diesen Link in Ihren Browser:<br>
                  <a href="${acceptUrl}">${acceptUrl}</a>
                </p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  <strong>Hinweis:</strong> Nach Ablauf der Einladung müssen Sie eine neue Einladung anfordern.
                </p>
              </div>
              
              <div class="footer">
                <p>
                  Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
                </p>
                <p>
                  Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
                </p>
                <p style="margin-top: 10px;">
                  ${new Date().getFullYear()} Einsatzplaner - Alle Rechte vorbehalten
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send invitation reminder:', error);
      throw new Error(
        `Failed to send invitation reminder email: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  async sendInvitationAcceptedNotificationEmail(
    recipients: { email: string; name: string }[],
    acceptedUser: {
      firstname: string;
      lastname: string;
      email: string;
    },
    organization: {
      name: string;
    },
    roles: string[]
  ) {
    if (!this.transporter || recipients.length === 0) {
      return;
    }

    const rolesList = roles.map((role) => `<li>${role}</li>`).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
              color: white; 
              padding: 20px; 
              border-radius: 8px; 
              margin-bottom: 20px; 
            }
            .content { padding: 20px 0; }
            .info-box {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #28a745;
            }
            .user-info {
              background: #e7f5ec;
              padding: 15px;
              border-radius: 5px;
              margin: 15px 0;
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #ddd; 
              font-size: 12px; 
              color: #666; 
            }
            ul { margin: 10px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Neues Mitglied beigetreten</h2>
            </div>
            
            <div class="content">
              <p>Hallo Verwaltungsteam,</p>
              
              <p>ein neues Mitglied hat die Einladung zu Ihrer Organisation angenommen:</p>
              
              <div class="info-box">
                <div class="user-info">
                  <strong>Name:</strong> ${acceptedUser.firstname} ${acceptedUser.lastname}<br>
                  <strong>E-Mail:</strong> ${acceptedUser.email}
                </div>
                
                <strong>Organisation:</strong> ${organization.name}<br>
                <strong>Zugewiesene Rollen:</strong>
                <ul>
                  ${rolesList}
                </ul>
              </div>
              
              <p>Die Person ist nun Teil Ihrer Organisation und kann auf das System zugreifen.</p>
            </div>
            
            <div class="footer">
              <p>
                Diese E-Mail wurde automatisch generiert, um die Verwaltung über neue Mitglieder zu informieren.
              </p>
              <p>
                ${new Date().getFullYear()} Einsatzplaner - ${organization.name}
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const mailOptions = {
        from: `"${organization.name} - Einsatzplaner" <${process.env.SMTP_USER}>`,
        to: recipients.map((r) => r.email).join(', '),
        subject: `${acceptedUser.firstname} ${acceptedUser.lastname} ist der Organisation beigetreten`,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        'Fehler beim Senden der Einladungs-Annahme-Benachrichtigung:',
        error
      );
      throw new Error(
        `E-Mail-Versand fehlgeschlagen: ${
          error instanceof Error ? error.message : 'Unbekannter Fehler'
        }`
      );
    }
  }

  async sendSelfSignupOrganizationCreatedNotificationEmail(input: {
    recipientEmail: string;
    organizationName: string;
    creatorName?: string | null;
    creatorEmail?: string | null;
  }) {
    if (!this.transporter) {
      return;
    }

    const safeOrganizationName = escapeHtml(input.organizationName);
    const safeCreatorName = input.creatorName
      ? escapeHtml(input.creatorName)
      : 'Unbekannt';
    const safeCreatorEmail = input.creatorEmail
      ? escapeHtml(input.creatorEmail)
      : 'Unbekannt';

    await this.transporter.sendMail({
      from: `"Einsatzplaner" <${process.env.SMTP_USER}>`,
      to: input.recipientEmail,
      subject: `Neue Organisation erstellt: ${safeOrganizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">Neue Organisation erstellt</h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>Hallo,</p>
            <p>soeben wurde eine neue Organisation im Einsatzplaner erstellt.</p>
            <p><strong>Organisation:</strong> ${safeOrganizationName}</p>
            <p><strong>Erstellt von:</strong> ${safeCreatorName}</p>
            <p><strong>E-Mail-Adresse:</strong> ${safeCreatorEmail}</p>
          </div>

          <p style="color: #666; font-size: 12px; text-align: center;">
            Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.
          </p>
        </div>
      `,
    });
  }

  async sendEinsatzWarningEmail(
    recipients: { email: string; name: string }[],
    einsatz: {
      id: string;
      title: string;
      start: Date;
    },
    warnings: string[],
    organization: {
      name: string;
      einsatz_name_singular: string;
      einsatz_name_plural: string;
      helper_name_singular: string;
      helper_name_plural: string;
    }
  ) {
    if (!this.transporter || recipients.length === 0) {
      return;
    }

    const terminology = {
      einsatz_singular: organization.einsatz_name_singular || 'Einsatz',
      einsatz_plural: organization.einsatz_name_plural || 'Einsätze',
      helper_singular: organization.helper_name_singular || 'Helfer:in',
      helper_plural: organization.helper_name_plural || 'Helfer:innen',
    };

    const einsatzUrl = `${process.env.NEXTAUTH_URL}/einsatzverwaltung?einsatz=${einsatz.id}`;
    const warningsList = warnings.map((w) => `<li>${w}</li>`).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { 
              background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
              color: white; 
              padding: 20px; 
              border-radius: 8px; 
              margin-bottom: 20px; 
            }
            .content { padding: 20px 0; }
            .warning-box {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .einsatz-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: #007bff; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { 
              margin-top: 30px; 
              padding-top: 20px; 
              border-top: 1px solid #ddd; 
              font-size: 12px; 
              color: #666; 
            }
            ul { margin: 10px 0; padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Dringende Überprüfung erforderlich</h2>
            </div>
            
            <div class="content">
              <p>Sehr geehrtes Verwaltungsteam,</p>
              
              <p>Für ${terminology.einsatz_singular} "${einsatz.title}" sind wichtige Anforderungen nicht erfüllt:</p>                
              <div class="einsatz-info">
                <strong>${terminology.einsatz_singular}:</strong> ${einsatz.title}<br>
                <strong>Zeitpunkt:</strong> ${einsatz.start.toLocaleString(
                  'de-DE',
                  {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
              </div>
              
              <div class="warning-box">
                <h3 style="margin-top: 0; color: #856404;">Folgende Kriterien sind nicht erfüllt:</h3>
                <ul style="color: #856404;">
                  ${warningsList}
                </ul>
              </div>
              
              <p>Bitte wenden Sie sich an die ${terminology.einsatz_singular}-Verwaltung, um die erforderlichen Personeneigenschaften zu klären.</p>
              
              <div style="text-align: center;">
                <a href="${einsatzUrl}" class="button">
                  ${terminology.einsatz_singular} öffnen und bearbeiten
                </a>
              </div>
            </div>
            
            <div class="footer">
              <p>
                Diese E-Mail wurde automatisch generiert, weil Sie zur Verwaltungsrolle der Organisation "${organization.name}" gehören.
              </p>
              <p>
                ${new Date().getFullYear()} Einsatzplaner
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const mailOptions = {
        from: `"${organization.name} - Einsatzplaner" <${process.env.SMTP_USER}>`,
        to: recipients.map((r) => r.email).join(', '),
        subject: `Dringende Überprüfung: ${einsatz.title}`,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Fehler beim Senden der Einsatz-Warnung:', error);
      throw new Error(
        `E-Mail-Versand fehlgeschlagen: ${
          error instanceof Error ? error.message : 'Unbekannter Fehler'
        }`
      );
    }
  }

  async sendOtpCodeEmail(recipientEmail: string, code: string) {
    if (!this.transporter) {
      return;
    }

    const mailOptions = {
      from: `"Einsatzplaner" <${process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: 'Ihr Bestätigungscode für den Einsatzplaner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; text-align: center;">E-Mail-Adresse bestätigen</h2>
          <div style="background: #f5f7fb; padding: 24px; border-radius: 12px; margin: 24px 0;">
            <p>Hallo,</p>
            <p>bitte geben Sie den folgenden 6-stelligen Bestätigungscode im Einsatzplaner ein:</p>
            <div style="text-align: center; margin: 32px 0;">
              <div style="display: inline-block; letter-spacing: 0.35em; font-size: 32px; font-weight: 700; color: #1f2937; background: white; padding: 16px 24px; border-radius: 10px; border: 1px solid #dbe3f0;">
                ${code}
              </div>
            </div>
            <p>Der Code ist 10 Minuten gültig. Falls Sie diese Anfrage nicht erwartet haben, können Sie diese E-Mail ignorieren.</p>
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">
            Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht darauf.
          </p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendNotificationDigestEmail(input: {
    recipientEmail: string;
    recipientName: string;
    organizationName: string;
    digestInterval: DigestInterval;
    entries: Array<{
      einsatzTitle: string;
      einsatzStart: Date;
      warningLines: string[];
      einsatzUrl: string;
    }>;
  }) {
    if (!this.transporter || input.entries.length === 0) {
      return;
    }

    try {
      const intervalLabel = buildDigestIntervalLabel(input.digestInterval);

      const entryItems = input.entries
        .map((entry) => {
          const safeEinsatzTitle = escapeHtml(entry.einsatzTitle);
          const safeEinsatzUrl = toSafeEmailUrl(entry.einsatzUrl);
          const warningItems = entry.warningLines
            .map((warning) => `<li>${escapeHtml(warning)}</li>`)
            .join('');

          return `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
              <p style="margin: 0 0 8px 0;"><strong>Einsatz:</strong> ${safeEinsatzTitle}</p>
              <p style="margin: 0 0 8px 0;"><strong>Start:</strong> ${entry.einsatzStart.toLocaleString(
                'de-DE',
                {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}</p>
              <ul style="margin: 0 0 12px 20px; padding: 0;">
                ${warningItems}
              </ul>
              <a href="${safeEinsatzUrl}" style="display: inline-block; background: #1d4ed8; color: #fff; text-decoration: none; border-radius: 6px; padding: 10px 14px;">
                Einsatz öffnen
              </a>
            </div>
          `;
        })
        .join('');

      const safeRecipientName = escapeHtml(input.recipientName);
      const safeOrganizationName = escapeHtml(input.organizationName);

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
            <div style="max-width: 680px; margin: 0 auto; padding: 20px;">
              <h2 style="margin: 0 0 10px 0;">Sammelmail Benachrichtigungen</h2>
              <p style="margin: 0 0 16px 0;">
                Sehr geehrte/r ${safeRecipientName},
              </p>
              <p style="margin: 0 0 16px 0;">
                Sie erhalten diese Sammelmail für <strong>${safeOrganizationName}</strong> (${intervalLabel}).
              </p>
              ${entryItems}
              <p style="margin-top: 18px; font-size: 12px; color: #475569;">
                Diese E-Mail wurde automatisch erstellt.
              </p>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `"${input.organizationName} - Einsatzplaner" <${process.env.SMTP_USER}>`,
        to: input.recipientEmail,
        subject: `Sammelmail Benachrichtigungen - ${input.organizationName}`,
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        'Fehler beim Senden der Benachrichtigungs-Sammelmail:',
        error
      );
      throw new Error(
        `Failed to send notification digest email: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

export const emailService = new EmailService();
