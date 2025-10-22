import nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter | null;

    constructor() {
        // Prüfe ob E-Mail-Service aktiviert ist
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn('E-Mail-Service ist nicht konfiguriert. E-Mails werden in der Konsole ausgegeben.');
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
            console.log('📧 E-Mail-Service deaktiviert. Reset-Link:');
            console.log(`   → ${resetUrl}`);
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

    async sendInvitationEmail(
        email: string,
        inviterName: string,
        organizationName: string,
        token: string
    ) {
        //const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${token}`;
        const inviteUrl = `${process.env.NEXTAUTH_URL}/api/invitations/${token}/accept`;

        if (!this.transporter) {
            console.log('📧 E-Mail-Service deaktiviert. Einladungs-Details:');
            console.log(`   → An: ${email}`);
            console.log(`   → Von: ${inviterName}`);
            console.log(`   → Organisation: ${organizationName}`);
            console.log(`   → Einladungslink: ${inviteUrl}`);
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
                        Eine moderne Plattform für die Verwaltung von Einsätzen, Helfern und Organisationen.
                        Koordinieren Sie Ihre Teams effizient und behalten Sie den Überblick.
                    </p>
                </div>
                
                <div style="border-top: 1px solid #e9ecef; margin-top: 30px; padding-top: 20px; text-align: center;">
                    <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        Diese E-Mail wurde automatisch generiert. Falls Sie diese Einladung nicht erwartet haben,
                        können Sie diese E-Mail ignorieren.
                    </p>
                    <p style="color: #6c757d; font-size: 12px; margin: 10px 0 0 0;">
                        © ${new Date().getFullYear()} Einsatzplaner - Alle Rechte vorbehalten
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

            console.log('📧 Sende Einladungs-E-Mail:');
            console.log(`   → An: ${email}`);
            console.log(`   → Organisation: ${organizationName}`);
            console.log(`   → Von: ${inviterName}`);

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Einladungs-E-Mail erfolgreich gesendet:', info.messageId);

            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error('❌ Fehler beim Senden der Einladungs-E-Mail:', error);
            throw new Error(`E-Mail-Versand fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        }
    }
}

// Singleton instance
export const emailService = new EmailService();
