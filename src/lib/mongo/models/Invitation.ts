import { ObjectId } from 'mongodb';
import zod from 'zod';
import { UserRoleSchema, type UserRole } from './User';

// Zod Schema für Einladungen
export const InviteUserSchema = zod.object({
    email: zod.string().email('Ungültige E-Mail-Adresse'),
    firstname: zod.string().min(2, 'Vorname muss mindestens 2 Zeichen lang sein'),
    lastname: zod.string().min(2, 'Nachname muss mindestens 1 Zeichen lang sein'),
    role: UserRoleSchema.default('Helfer'),
    message: zod.string().optional(),
    organizationName: zod.string().min(2, 'Organisationsname muss mindestens 2 Zeichen lang sein'),
});

export const AcceptInviteSchema = zod.object({
    token: zod.string().min(1, 'Einladungstoken ist erforderlich'),
    password: zod.string()
        .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten')
        .max(64, 'Passwort darf maximal 64 Zeichen lang sein'),
    confirmPassword: zod.string()
});

export type InviteUserData = zod.infer<typeof InviteUserSchema>;
export type AcceptInviteData = zod.infer<typeof AcceptInviteSchema>;

// MongoDB Invitation Interface
export interface Invitation {
    _id?: ObjectId;
    email: string;
    firstname: string;
    lastname: string;
    role: UserRole;
    message?: string;
    invitedBy: ObjectId;
    inviteToken: string | null; // Kann null sein nach Akzeptierung/Ablauf
    organizationName: string;
    createdAt: Date;
    updatedAt: Date;
    status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
    expiresAt: Date;
    
    // Analytics & Tracking
    acceptedAt?: Date;
    acceptedByUserId?: ObjectId;
    declinedAt?: Date;
    expiredAt?: Date;
    cancelledAt?: Date;
    cancelledBy?: ObjectId;
    
    // Datenschutz & Compliance
    anonymized?: boolean;
    anonymizedAt?: Date;
    lastActivityAt?: Date;
    
    // Zusätzliche Metadaten
    inviteSource?: 'admin' | 'bulk' | 'api'; // Wie wurde die Einladung erstellt
    remindersSent?: number; // Anzahl der Reminder
    lastReminderSent?: Date;
}

export const INVITATIONS_COLLECTION = 'invitations';

// Factory Pattern für Invitation Creation
export class InvitationFactory {
    static create(inviteData: InviteUserData, invitedBy: ObjectId): Omit<Invitation, '_id'> {
        const validatedData = InviteUserSchema.parse(inviteData);
        
        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(now.getDate() + 7); // 7 Tage gültig
        
        return {
            ...validatedData,
            invitedBy,
            inviteToken: InvitationTokenGenerator.generate(),
            status: 'pending',
            expiresAt,
            createdAt: now,
            updatedAt: now,
        };
    }
}

// Strategy Pattern für Token Generation
export class InvitationTokenGenerator {
    static generate(): string {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15) + 
               Date.now().toString(36);
    }
}

// Repository Pattern für Database Operations
export class InvitationRepository {
    constructor(private db: any) {}

    async createIndexes(): Promise<void> {
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ email: 1 });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ inviteToken: 1 }, { unique: true, sparse: true });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ expiresAt: 1 });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ status: 1 });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ invitedBy: 1 });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ createdAt: 1 });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ organizationName: 1 });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ acceptedAt: 1 });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ anonymized: 1 });
        
        // Composite Indexes für Analytics
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ 
            organizationName: 1, 
            status: 1, 
            createdAt: 1 
        });
        await this.db.collection(INVITATIONS_COLLECTION).createIndex({ 
            invitedBy: 1, 
            status: 1, 
            createdAt: 1 
        });
    }

    async findByEmail(email: string): Promise<Invitation | null> {
        return await this.db.collection(INVITATIONS_COLLECTION).findOne({ 
            email,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });
    }

    async findByToken(token: string): Promise<Invitation | null> {
        return await this.db.collection(INVITATIONS_COLLECTION).findOne({ 
            inviteToken: token,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });
    }

    async create(invitation: Omit<Invitation, '_id'>): Promise<Invitation> {
        const result = await this.db.collection(INVITATIONS_COLLECTION).insertOne(invitation);
        return { ...invitation, _id: result.insertedId };
    }

    // Status-Management Methoden
    async updateStatus(invitationId: ObjectId, statusUpdate: {
        status: Invitation['status'];
        acceptedAt?: Date;
        acceptedByUserId?: ObjectId;
        declinedAt?: Date;
        expiredAt?: Date;
        cancelledAt?: Date;
        cancelledBy?: ObjectId;
        inviteToken?: string | null;
        updatedAt: Date;
    }): Promise<void> {
        await this.db.collection(INVITATIONS_COLLECTION).updateOne(
            { _id: invitationId },
            { 
                $set: {
                    ...statusUpdate,
                    lastActivityAt: new Date()
                }
            }
        );
    }

    async markAsAccepted(invitationId: ObjectId, acceptedByUserId: ObjectId): Promise<void> {
        await this.updateStatus(invitationId, {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedByUserId,
            inviteToken: null, // Token für Sicherheit entfernen
            updatedAt: new Date()
        });
    }

    async markAsDeclined(invitationId: ObjectId): Promise<void> {
        await this.updateStatus(invitationId, {
            status: 'declined',
            declinedAt: new Date(),
            inviteToken: null,
            updatedAt: new Date()
        });
    }

    async markAsExpired(invitationIds: ObjectId[]): Promise<void> {
        await this.db.collection(INVITATIONS_COLLECTION).updateMany(
            { _id: { $in: invitationIds } },
            {
                $set: {
                    status: 'expired',
                    expiredAt: new Date(),
                    inviteToken: null,
                    updatedAt: new Date(),
                    lastActivityAt: new Date()
                }
            }
        );
    }

    async cancelInvitation(invitationId: ObjectId, cancelledBy: ObjectId): Promise<void> {
        await this.updateStatus(invitationId, {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy,
            inviteToken: null,
            updatedAt: new Date()
        });
    }

    // Analytics Methoden
    async getInvitationStats(organizationName: string, days: number = 30): Promise<{
        total: number;
        pending: number;
        accepted: number;
        declined: number;
        expired: number;
        cancelled: number;
        conversionRate: number;
        avgAcceptanceTime: number;
    }> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const stats = await this.db.collection(INVITATIONS_COLLECTION).aggregate([
            {
                $match: {
                    organizationName,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    avgAcceptanceTime: {
                        $avg: {
                            $cond: [
                                { $eq: ['$status', 'accepted'] },
                                { $subtract: ['$acceptedAt', '$createdAt'] },
                                null
                            ]
                        }
                    }
                }
            }
        ]).toArray();

        const result = {
            total: 0,
            pending: 0,
            accepted: 0,
            declined: 0,
            expired: 0,
            cancelled: 0,
            conversionRate: 0,
            avgAcceptanceTime: 0
        };

        stats.forEach((stat: any) => {
            result.total += stat.count;
            if (stat._id in result) {
                (result as any)[stat._id] = stat.count;
            }
            if (stat._id === 'accepted' && stat.avgAcceptanceTime) {
                result.avgAcceptanceTime = stat.avgAcceptanceTime;
            }
        });

        result.conversionRate = result.total > 0 ? (result.accepted / result.total) * 100 : 0;
        result.avgAcceptanceTime = result.avgAcceptanceTime / (1000 * 60 * 60 * 24); // Convert to days

        return result;
    }

    async getInviterStats(invitedBy: ObjectId, days: number = 30): Promise<{
        totalInvitations: number;
        acceptedInvitations: number;
        conversionRate: number;
        topRoles: { role: string; count: number }[];
    }> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const stats = await this.db.collection(INVITATIONS_COLLECTION).aggregate([
            {
                $match: {
                    invitedBy,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        status: '$status',
                        role: '$role'
                    },
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        const result = {
            totalInvitations: 0,
            acceptedInvitations: 0,
            conversionRate: 0,
            topRoles: [] as { role: string; count: number }[]
        };

        const roleStats = new Map<string, number>();

        stats.forEach((stat: any) => {
            result.totalInvitations += stat.count;
            if (stat._id.status === 'accepted') {
                result.acceptedInvitations += stat.count;
            }
            
            const currentCount = roleStats.get(stat._id.role) || 0;
            roleStats.set(stat._id.role, currentCount + stat.count);
        });

        result.conversionRate = result.totalInvitations > 0 ? 
            (result.acceptedInvitations / result.totalInvitations) * 100 : 0;

        result.topRoles = Array.from(roleStats.entries())
            .map(([role, count]) => ({ role, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return result;
    }

    // Datenschutz & Compliance
    async anonymizeOldInvitations(daysOld: number = 365): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await this.db.collection(INVITATIONS_COLLECTION).updateMany(
            {
                createdAt: { $lt: cutoffDate },
                anonymized: { $ne: true }
            },
            {
                $set: {
                    email: 'anonymized@example.com',
                    firstname: 'Anonymized',
                    lastname: 'User',
                    message: null,
                    anonymized: true,
                    anonymizedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        return result.modifiedCount;
    }

    async cleanupExpiredInvitations(): Promise<number> {
        const now = new Date();
        
        // Finde alle expired invitations
        const expiredInvitations = await this.db.collection(INVITATIONS_COLLECTION).find({
            expiresAt: { $lt: now },
            status: 'pending'
        }).toArray();

        if (expiredInvitations.length === 0) return 0;

        const expiredIds = expiredInvitations.map((inv: any) => inv._id);
        await this.markAsExpired(expiredIds);

        return expiredIds.length;
    }

    async findExpiredInvitations(days: number = 7): Promise<Invitation[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return await this.db.collection(INVITATIONS_COLLECTION).find({
            expiresAt: { $lt: cutoffDate },
            status: 'pending'
        }).toArray();
    }

    async incrementReminderCount(invitationId: ObjectId): Promise<void> {
        await this.db.collection(INVITATIONS_COLLECTION).updateOne(
            { _id: invitationId },
            { 
                $inc: { remindersSent: 1 },
                $set: { 
                    lastReminderSent: new Date(),
                    updatedAt: new Date(),
                    lastActivityAt: new Date()
                }
            }
        );
    }

    async findInvitationsForReminder(daysSinceCreated: number = 3): Promise<Invitation[]> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysSinceCreated);

        return await this.db.collection(INVITATIONS_COLLECTION).find({
            createdAt: { $lt: cutoffDate },
            status: 'pending',
            expiresAt: { $gt: new Date() },
            $or: [
                { remindersSent: { $exists: false } },
                { remindersSent: { $lt: 2 } }
            ]
        }).toArray();
    }

    async findByInviter(invitedBy: ObjectId): Promise<Invitation[]> {
        return await this.db.collection(INVITATIONS_COLLECTION).find({ invitedBy }).toArray();
    }

    async findPendingInvitations(organizationName?: string): Promise<Invitation[]> {
        const query: any = { 
            status: 'pending',
            expiresAt: { $gt: new Date() }
        };
        
        if (organizationName) {
            query.organizationName = organizationName;
        }
        
        return await this.db.collection(INVITATIONS_COLLECTION).find(query).toArray();
    }

    async findRecentInvitations(organizationName: string, limit: number = 10): Promise<Invitation[]> {
        return await this.db.collection(INVITATIONS_COLLECTION)
            .find({ organizationName })
            .sort({ createdAt: -1 })
            .limit(limit)
            .toArray();
    }
}

// Validator Pattern
export class InvitationValidator {
    static validateInvitation(data: unknown): InviteUserData {
        return InviteUserSchema.parse(data);
    }

    static validateAcceptInvitation(data: unknown): AcceptInviteData {
        const parsed = AcceptInviteSchema.parse(data);
        
        if (parsed.password !== parsed.confirmPassword) {
            throw new Error('Passwörter stimmen nicht überein');
        }
        
        return parsed;
    }
}
