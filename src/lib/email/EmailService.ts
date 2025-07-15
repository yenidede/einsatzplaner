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
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            debug: true, // Debug-Modus aktivieren
            logger: true, // Logging aktivieren
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

    async sendInvitationEmail(email: string, subject: string, htmlContent: string) {
        if (!this.transporter) {
            console.log('📧 E-Mail-Service deaktiviert. Einladungs-E-Mail:');
            console.log(`   → An: ${email}`);
            console.log(`   → Betreff: ${subject}`);
            console.log(`   → Inhalt: ${htmlContent}`);
            throw new Error('E-Mail-Service ist nicht konfiguriert. Bitte konfigurieren Sie SMTP_USER und SMTP_PASS in den Umgebungsvariablen.');
        }

        try {
            const mailOptions = {
                from: `"Einsatzplaner" <${process.env.SMTP_USER}>`,
                to: email,
                subject: subject,
                html: htmlContent,
            };
            
            console.log('📧 Sende E-Mail mit folgenden Optionen:');
            console.log('   → Von:', mailOptions.from);
            console.log('   → An:', mailOptions.to);
            console.log('   → Betreff:', mailOptions.subject);
            
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ E-Mail erfolgreich gesendet:', info.messageId);
            //console.log('   → Response:', info.response);
            
        } catch (error) {
            console.error('❌ Fehler beim Senden der E-Mail:', error);
            throw error;
        }
    }
}

// Singleton instance
export const emailService = new EmailService();
