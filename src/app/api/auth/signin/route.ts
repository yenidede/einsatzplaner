import { NextResponse } from "next/server";
import { compare } from "bcryptjs";


// Data Transfer Object (DTO) Pattern
interface SignInRequest {
    email: string;
    password: string;
}

interface SignInResponse {
    message: string;
    token: string;
    user: {
        id: string;
        email: string;
        firstname: string;
        lastname: string;
        role: string;
    };
}

// Validation Service (Single Responsibility Principle)
class SignInValidationService {
    static validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static validatePassword(password: string): boolean {
        return Boolean(password && password.length >= 1); // Mindestens 1 Zeichen für Login
    }

    static validateSignInRequest(data: SignInRequest): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.email) {
            errors.push('E-Mail ist erforderlich');
        } else if (!this.validateEmail(data.email)) {
            errors.push('Ungültige E-Mail-Adresse');
        }

        if (!data.password) {
            errors.push('Passwort ist erforderlich');
        } else if (!this.validatePassword(data.password)) {
            errors.push('Passwort ist zu kurz');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Authentication Service (Single Responsibility Principle)
class AuthenticationService {
    static async comparePassword(password: string, hash: string): Promise<boolean> {
        return await compare(password, hash);
    }

    static generateToken(user: any): string {
        // Simplified token generation without JWT dependency
        // In production, use proper JWT or session management
        return Buffer.from(JSON.stringify({
            userId: user._id,
            email: user.email,
            role: user.role,
            timestamp: Date.now()
        })).toString('base64');
    }
}

// Database Service (Repository Pattern)
class UserAuthRepository {
    private db: any;

    constructor(db: any) {
        this.db = db;
    }

    async findUserByEmail(email: string) {
        return await this.db.collection(USERS_COLLECTION).findOne({ 
            email: email.toLowerCase() 
        });
    }

    async updateLastLogin(userId: string) {
        return await this.db.collection(USERS_COLLECTION).updateOne(
            { _id: userId },
            { 
                $set: { 
                    lastLogin: new Date(),
                    updatedAt: new Date() 
                } 
            }
        );
    }
}

// Rate Limiting Service (Single Responsibility Principle)
class RateLimitingService {
    private static attempts: Map<string, { count: number; resetTime: number }> = new Map();

    static checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number } {
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 Minuten
        const maxAttempts = 5;

        const userAttempts = this.attempts.get(ip) || { count: 0, resetTime: now + windowMs };

        // Reset wenn Zeit abgelaufen
        if (now > userAttempts.resetTime) {
            userAttempts.count = 0;
            userAttempts.resetTime = now + windowMs;
        }

        if (userAttempts.count >= maxAttempts) {
            return { allowed: false, remainingAttempts: 0 };
        }

        return { allowed: true, remainingAttempts: maxAttempts - userAttempts.count };
    }

    static recordAttempt(ip: string) {
        const now = Date.now();
        const windowMs = 15 * 60 * 1000;
        const userAttempts = this.attempts.get(ip) || { count: 0, resetTime: now + windowMs };
        
        userAttempts.count++;
        this.attempts.set(ip, userAttempts);
    }

    static resetAttempts(ip: string) {
        this.attempts.delete(ip);
    }
}

// Main Controller (Controller Pattern)
export async function POST(req: Request) {
    try {
        // Rate Limiting
        const ip = req.headers.get('x-forwarded-for') || 
                  req.headers.get('x-real-ip') || 
                  'unknown';

        const rateLimitCheck = RateLimitingService.checkRateLimit(ip);
        if (!rateLimitCheck.allowed) {
            return NextResponse.json({ 
                error: "Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten." 
            }, { status: 429 });
        }

        // Parse and validate request
        const body: SignInRequest = await req.json();
        const validation = SignInValidationService.validateSignInRequest(body);
        
        if (!validation.isValid) {
            RateLimitingService.recordAttempt(ip);
            return NextResponse.json({ 
                error: validation.errors.join(', ') 
            }, { status: 400 });
        }

        // Initialize database connection
        const client = await clientPromise;
        if (!client) {
            return NextResponse.json({ 
                error: "Datenbankverbindung fehlgeschlagen" 
            }, { status: 500 });
        }

        const db = client.db();
        const userAuthRepo = new UserAuthRepository(db);

        // Find user by email
        const user = await userAuthRepo.findUserByEmail(body.email);
        if (!user) {
            RateLimitingService.recordAttempt(ip);
            return NextResponse.json({ 
                error: "Ungültige E-Mail oder Passwort" 
            }, { status: 401 });
        }

        // Verify password
        const isPasswordValid = await AuthenticationService.comparePassword(
            body.password, 
            user.password
        );

        if (!isPasswordValid) {
            RateLimitingService.recordAttempt(ip);
            return NextResponse.json({ 
                error: "Ungültige E-Mail oder Passwort" 
            }, { status: 401 });
        }

        // Check if user is active
        if (user.isActive === false) {
            RateLimitingService.recordAttempt(ip);
            return NextResponse.json({ 
                error: "Ihr Account ist deaktiviert. Kontaktieren Sie den Administrator." 
            }, { status: 403 });
        }

        // Generate JWT token
        const token = AuthenticationService.generateToken(user);

        // Update last login
        await userAuthRepo.updateLastLogin(user._id);

        // Reset rate limiting for successful login
        RateLimitingService.resetAttempts(ip);

        // Return success response
        const response: SignInResponse = {
            message: "Anmeldung erfolgreich",
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
                role: user.role
            }
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error("Fehler bei der Anmeldung:", error);
        return NextResponse.json({ 
            error: "Interner Serverfehler" 
        }, { status: 500 });
    }
}
