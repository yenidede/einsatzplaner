import { ObjectId } from 'mongodb';
import zod from 'zod';

// Zod Schema für User-Rollen
export const UserRoleSchema = zod.enum(['Organisationsverwaltung', 'Einsatzverwaltung', 'Helfer']);

// Zod Schema für User-Erstellung
export const CreateUserSchema = zod.object({
    email: zod.string().email('Ungültige E-Mail-Adresse'),
    password: zod.string()
        .min(8, 'Passwort muss mindestens 8 Zeichen lang sein')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten')
        .max(64, 'Passwort darf maximal 64 Zeichen lang sein'),
    firstname: zod.string().min(2, 'Vorname muss mindestens 2 Zeichen lang sein'),
    lastname: zod.string().min(2, 'Nachname muss mindestens 1 Zeichen lang sein'),
    role: UserRoleSchema.default('Helfer'),
    organizationName: zod.string().optional(),
    invitedBy: zod.string().optional(), // ObjectId als String
});

// Zod Schema für User-Update
export const UpdateUserSchema = zod.object({
    email: zod.string().email('Ungültige E-Mail-Adresse').optional(),
    firstname: zod.string().min(2, 'Vorname muss mindestens 2 Zeichen lang sein').optional(),
    lastname: zod.string().min(2, 'Nachname muss mindestens 1 Zeichen lang sein').optional(),
    role: UserRoleSchema.optional(),
    isActive: zod.boolean().optional(),
    emailVerified: zod.boolean().optional(),
});

// Zod Schema für Login
export const LoginSchema = zod.object({
    email: zod.string().email('Ungültige E-Mail-Adresse'),
    password: zod.string().min(1, 'Passwort ist erforderlich'),
});

// TypeScript Types aus Zod Schemas
export type CreateUserData = zod.infer<typeof CreateUserSchema>;
export type UpdateUserData = zod.infer<typeof UpdateUserSchema>;
export type LoginData = zod.infer<typeof LoginSchema>;
export type UserRole = zod.infer<typeof UserRoleSchema>;

// MongoDB User Interface
export interface User {
    _id?: ObjectId;
    email: string;
    password: string;
    firstname: string;
    lastname: string;
    role: UserRole;
    organizationName: string;
    invitedBy?: ObjectId;
    isActive: boolean;
    emailVerified?: boolean;
    // Reset password fields
    resetToken?: string;
    resetTokenExpiry?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// User ohne Password für API Responses
export interface UserWithoutPassword extends Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry'> {}

// Collection name constant
export const USERS_COLLECTION = 'users';


// Repository Pattern für User Database Operations
export class UserRepository {
    constructor(private db: any) {}

    async createIndexes(): Promise<void> {
        await this.db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true });
        await this.db.collection(USERS_COLLECTION).createIndex({ createdAt: 1 });
        await this.db.collection(USERS_COLLECTION).createIndex({ role: 1 });
        await this.db.collection(USERS_COLLECTION).createIndex({ isActive: 1 });
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.db.collection(USERS_COLLECTION).findOne({ email });
    }

    async findById(id: ObjectId): Promise<User | null> {
        return await this.db.collection(USERS_COLLECTION).findOne({ _id: id });
    }

    async create(user: Omit<User, '_id'>): Promise<User> {
        const result = await this.db.collection(USERS_COLLECTION).insertOne(user);
        return { ...user, _id: result.insertedId };
    }

    async update(id: ObjectId, updateData: Partial<User>): Promise<void> {
        await this.db.collection(USERS_COLLECTION).updateOne(
            { _id: id },
            { $set: { ...updateData, updatedAt: new Date() } }
        );
    }

    async findByRole(role: UserRole): Promise<User[]> {
        return await this.db.collection(USERS_COLLECTION)
            .find({ role, isActive: true })
            .toArray();
    }
}

// Factory Pattern für User Creation
export class UserFactory {
    static create(userData: CreateUserData): Omit<User, '_id'> {
        const validatedData = CreateUserSchema.parse(userData);
        
        const now = new Date();
        return {
            ...validatedData,
            organizationName: validatedData.organizationName ?? '',
            invitedBy: validatedData.invitedBy ? new ObjectId(validatedData.invitedBy) : undefined,
            isActive: true,
            emailVerified: false,
            createdAt: now,
            updatedAt: now,
        };
    }

    static createFromInvitation(invitation: any, password: string): Omit<User, '_id'> {
        const now = new Date();
        return {
            email: invitation.email,
            password,
            firstname: invitation.firstname,
            lastname: invitation.lastname,
            role: invitation.role,
            organizationName: invitation.organizationName,
            invitedBy: invitation.invitedBy,
            isActive: true,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
        };
    }
}

// Helper functions for validation and sanitization
export const userHelpers = {
    // Remove password from user object
    sanitizeUser: (user: User): UserWithoutPassword => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    },
    
    // Prepare user data for update with validation
    prepareUserForUpdate: (userData: UpdateUserData): UpdateUserData & { updatedAt: Date } => {
        const validatedData = UpdateUserSchema.parse(userData);
        
        return {
            ...validatedData,
            updatedAt: new Date(),
        };
    },
    
    // Validate login data
    validateLogin: (loginData: unknown): LoginData => {
        return LoginSchema.parse(loginData);
    },
    
    // Validate user creation data
    validateUserCreation: (userData: unknown): CreateUserData => {
        return CreateUserSchema.parse(userData);
    },
    
    // Validate user update data
    validateUserUpdate: (userData: unknown): UpdateUserData => {
        return UpdateUserSchema.parse(userData);
    },
};