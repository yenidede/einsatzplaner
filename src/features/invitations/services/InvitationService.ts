import { hash } from 'bcryptjs';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongo/client';
import { UserRepository, UserFactory, USERS_COLLECTION } from '@/lib/mongo/models/User';
import { 
    InvitationRepository, 
    InvitationFactory, 
    InvitationValidator,
    INVITATIONS_COLLECTION,
    type InviteUserData,
    type AcceptInviteData,
    type Invitation
} from '@/lib/mongo/models/Invitation';
import { EmailService } from '@/lib/email/EmailService';

// Domain Service für Invitation Business Logic
export class InvitationService {
    private userRepository: UserRepository;
    private invitationRepository: InvitationRepository;
    private emailService: EmailService;

    constructor(
        userRepository: UserRepository,
        invitationRepository: InvitationRepository,
        emailService: EmailService
    ) {
        this.userRepository = userRepository;
        this.invitationRepository = invitationRepository;
        this.emailService = emailService;
    }

    // Factory Method für Service Creation
    static async create(): Promise<InvitationService> {
        const client = await clientPromise;
        if (!client) {
            throw new Error('Datenbankverbindung fehlgeschlagen');
        }
        
        const db = client.db();
        
        const userRepository = new UserRepository(db);
        const invitationRepository = new InvitationRepository(db);
        const emailService = new EmailService();
        
        return new InvitationService(userRepository, invitationRepository, emailService);
    }

    async createInvitation(inviteData: InviteUserData, invitedBy: ObjectId): Promise<{ invitation: Invitation; inviteLink: string }> {
        // Validierung
        const validatedData = InvitationValidator.validateInvitation(inviteData);

        // Prüfen ob einladender Benutzer existiert
        const inviter = await this.userRepository.findById(invitedBy);
        if (!inviter) {
            throw new Error('Einladender Benutzer nicht gefunden');
        }

        // Prüfen ob Benutzer bereits existiert
        const existingUser = await this.userRepository.findByEmail(validatedData.email);
        if (existingUser) {
            throw new Error('Benutzer mit dieser E-Mail-Adresse existiert bereits');
        }

        // Prüfen ob bereits eine Einladung existiert
        const existingInvitation = await this.invitationRepository.findByEmail(validatedData.email);
        if (existingInvitation) {
            throw new Error('Für diese E-Mail-Adresse wurde bereits eine Einladung versendet');
        }

        // Einladung erstellen
        const invitation = InvitationFactory.create(validatedData, invitedBy);
        const createdInvitation = await this.invitationRepository.create(invitation);

        // E-Mail versenden
        const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${createdInvitation.inviteToken}`;
        
        console.log('🚀 EINLADUNG: E-Mail wird versendet...');
        console.log('   → An:', validatedData.email);
        console.log('   → Link:', inviteLink);
        
        // E-Mail-Content erstellen
        const subject = `Einladung zur Organisation ${validatedData.organizationName}`;
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333; text-align: center;">Einladung zur Organisation ${validatedData.organizationName}</h2>
                
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p>Hallo ${validatedData.firstname} ${validatedData.lastname},</p>
                    
                    <p><strong>${inviter.firstname} ${inviter.lastname}</strong> lädt Sie ein, der Organisation "<strong>${validatedData.organizationName}</strong>" als <strong>${validatedData.role}</strong> beizutreten.</p>
                    
                    ${validatedData.message ? `<p><strong>Persönliche Nachricht:</strong><br>${validatedData.message}</p>` : ''}
                    
                    <p><strong>Um die Einladung anzunehmen, kopieren Sie den folgenden Link und fügen Sie ihn in Ihren Browser ein:</strong></p>
                    
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="font-family: monospace; font-size: 14px; margin: 0; word-break: break-all;">${inviteLink}</p>
                    </div>
                    
                    <p><strong>Wichtig:</strong> Diese Einladung ist 7 Tage gültig.</p>
                    
                    <p style="color: #666; font-size: 12px;">
                        Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
                    </p>
                </div>
                
                <p style="color: #666; font-size: 12px; text-align: center;">
                    Mit freundlichen Grüßen,<br>
                    Das ${validatedData.organizationName} Team
                </p>
            </div>
        `;

        // E-Mail direkt über EmailService versenden (genau wie bei Passwort vergessen)
        await this.emailService.sendInvitationEmail(validatedData.email, subject, htmlContent);

        console.log('✅ EINLADUNG: E-Mail-Versand abgeschlossen');
        
        return { invitation: createdInvitation, inviteLink };
    }

    async getInvitationByToken(token: string): Promise<Invitation | null> {
        return await this.invitationRepository.findByToken(token);
    }

    async acceptInvitation(acceptData: AcceptInviteData): Promise<{ user: any; invitation: Invitation; wasNewUser: boolean }> {
        // Validierung
        const validatedData = InvitationValidator.validateAcceptInvitation(acceptData);

        // Einladung laden
        const invitation = await this.invitationRepository.findByToken(validatedData.token);
        if (!invitation) {
            throw new Error('Einladung nicht gefunden oder abgelaufen');
        }

        // Prüfen ob Benutzer bereits existiert
        const existingUser = await this.userRepository.findByEmail(invitation.email);
        if (existingUser) {
            throw new Error('Benutzer mit dieser E-Mail-Adresse existiert bereits');
        }

        // Passwort hashen
        const hashedPassword = await hash(validatedData.password, 12);

        // Benutzer erstellen
        const userData = UserFactory.createFromInvitation(invitation, hashedPassword);
        const userResult = await this.userRepository.create(userData);

        if (!userResult._id) {
            throw new Error('Fehler beim Erstellen des Benutzers');
        }

        // Einladung als akzeptiert markieren (NICHT löschen!)
        await this.invitationRepository.markAsAccepted(invitation._id!, userResult._id);

        return {
            user: {
                ...userData,
                _id: userResult._id
            },
            invitation,
            wasNewUser: true
        };
    }

    async getInvitationsByInviter(invitedBy: ObjectId): Promise<Invitation[]> {
        return await this.invitationRepository.findByInviter(invitedBy);
    }

    async expireOldInvitations(): Promise<void> {
        await this.invitationRepository.findExpiredInvitations();
    }

    // Analytics & Monitoring
    async getInvitationStatistics(organizationName: string, days: number = 30) {
        return await this.invitationRepository.getInvitationStats(organizationName, days);
    }

    async getInviterStatistics(invitedBy: ObjectId, days: number = 30) {
        return await this.invitationRepository.getInviterStats(invitedBy, days);
    }

    // Maintenance & Cleanup
    async cleanupExpiredInvitations(): Promise<{ cleaned: number; anonymized: number }> {
        const cleaned = await this.invitationRepository.cleanupExpiredInvitations();
        const anonymized = await this.invitationRepository.anonymizeOldInvitations(365);
        
        console.log(`🧹 Invitation Cleanup: ${cleaned} expired, ${anonymized} anonymized`);
        
        return { cleaned, anonymized };
    }

    async sendReminderEmails(): Promise<number> {
        const invitationsForReminder = await this.invitationRepository.findInvitationsForReminder(3);
        let sentCount = 0;

        for (const invitation of invitationsForReminder) {
            try {
                // Inviter-Daten laden
                const inviter = await this.userRepository.findById(invitation.invitedBy);
                if (!inviter) continue;

                // Reminder-E-Mail senden
                const inviteLink = `${process.env.NEXTAUTH_URL}/invite/${invitation.inviteToken}`;
                await this.emailService.sendInvitationEmail(invitation.email, `Erinnerung: Einladung zur Organisation ${invitation.organizationName}`, `
                    <p>Hallo ${invitation.firstname} ${invitation.lastname},</p>
                    <p>Dies ist eine Erinnerung an die Einladung zur Organisation <strong>${invitation.organizationName}</strong>.</p>
                    <p>Um die Einladung anzunehmen, klicken Sie bitte auf den folgenden Link: <a href="${inviteLink}">${inviteLink}</a></p>
                    <p>Falls Sie Fragen haben, wenden Sie sich bitte an ${inviter.firstname} ${inviter.lastname}.</p>
                    <p>Mit freundlichen Grüßen,<br>Das ${invitation.organizationName} Team</p>
                `);

                // Reminder-Counter erhöhen
                await this.invitationRepository.incrementReminderCount(invitation._id!);
                sentCount++;

                console.log(`📧 Reminder gesendet an: ${invitation.email}`);
            } catch (error) {
                console.error(`❌ Fehler beim Senden der Reminder-E-Mail an ${invitation.email}:`, error);
            }
        }

        return sentCount;
    }

    async cancelInvitation(invitationId: ObjectId, cancelledBy: ObjectId): Promise<void> {
        await this.invitationRepository.cancelInvitation(invitationId, cancelledBy);
        console.log(`🚫 Einladung ${invitationId} wurde storniert`);
    }

    async declineInvitation(token: string): Promise<void> {
        const invitation = await this.invitationRepository.findByToken(token);
        if (!invitation) {
            throw new Error('Einladung nicht gefunden oder bereits abgelaufen');
        }

        await this.invitationRepository.markAsDeclined(invitation._id!);
        console.log(`❌ Einladung ${invitation._id} wurde abgelehnt`);
    }
}

// Factory Pattern für Service Creation
export class InvitationServiceFactory {
    static async createDefault(): Promise<InvitationService> {
        return await InvitationService.create();
    }
}
