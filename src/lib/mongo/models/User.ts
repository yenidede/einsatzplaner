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
    isActive: boolean;
    emailVerified?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserWithoutPassword extends Omit<User, 'password'> {}

// Collection name constant
export const USERS_COLLECTION = 'users';

// Helper functions for database operations
export const userHelpers = {
    // Create indexes for the users collection
    createIndexes: async (db: any) => {
        await db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true });
        await db.collection(USERS_COLLECTION).createIndex({ createdAt: 1 });
    },
    
    // Remove password from user object
    sanitizeUser: (user: User): UserWithoutPassword => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    },
    
    // Prepare user data for creation with validation
    prepareUserForCreation: (userData: CreateUserData): Omit<User, '_id'> => {
        // Validate input data
        const validatedData = CreateUserSchema.parse(userData);
        
        const now = new Date();
        return {
            ...validatedData,
            isActive: true,
            emailVerified: false,
            createdAt: now,
            updatedAt: now,
        };
    },
    
    // Prepare user data for update with validation
    prepareUserForUpdate: (userData: UpdateUserData): UpdateUserData & { updatedAt: Date } => {
        // Validate input data
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

