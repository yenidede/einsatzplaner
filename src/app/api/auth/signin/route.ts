import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getUserByEmail } from "@/DataAccessLayer/user";
import { email } from "zod";
import prisma from "@/lib/prisma";

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

  static validateSignInRequest(data: SignInRequest): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.email) {
      errors.push("E-Mail ist erforderlich");
    } else if (!this.validateEmail(data.email)) {
      errors.push("Ungültige E-Mail-Adresse");
    }

    if (!data.password) {
      errors.push("Passwort ist erforderlich");
    } else if (!this.validatePassword(data.password)) {
      errors.push("Passwort ist zu kurz");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Authentication Service (Single Responsibility Principle)
class AuthenticationService {
  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return await compare(password, hash);
  }

  static generateToken(user: any): string {
    // Token enthält jetzt alle Rollen als Array
    return Buffer.from(
      JSON.stringify({
        userId: user._id,
        email: user.email,
        roles: user.roles,
        timestamp: Date.now(),
      })
    ).toString("base64");
  }
}

// Rate Limiting Service (Single Responsibility Principle)
class RateLimitingService {
  private static attempts: Map<string, { count: number; resetTime: number }> =
    new Map();

  static checkRateLimit(ip: string): {
    allowed: boolean;
    remainingAttempts: number;
  } {
    const now = Date.now();
    const windowMs = 0.1 * 60 * 1000; // 15 Minuten
    const maxAttempts = 5;

    const userAttempts = this.attempts.get(ip) || {
      count: 0,
      resetTime: now + windowMs,
    };

    // Reset wenn Zeit abgelaufen
    if (now > userAttempts.resetTime) {
      userAttempts.count = 0;
      userAttempts.resetTime = now + windowMs;
    }

    if (userAttempts.count >= maxAttempts) {
      return { allowed: false, remainingAttempts: 0 };
    }

    return {
      allowed: true,
      remainingAttempts: maxAttempts - userAttempts.count,
    };
  }

  static recordAttempt(ip: string) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const userAttempts = this.attempts.get(ip) || {
      count: 0,
      resetTime: now + windowMs,
    };

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
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const rateLimitCheck = RateLimitingService.checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: "Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten.",
        },
        { status: 429 }
      );
    }

    // Parse and validate request
    const body: SignInRequest = await req.json();
    const validation = SignInValidationService.validateSignInRequest(body);

    if (!validation.isValid) {
      RateLimitingService.recordAttempt(ip);
      return NextResponse.json(
        {
          error: validation.errors.join(", "),
        },
        { status: 400 }
      );
    }

    // Find user by email using Prisma DAL
    const user = await getUserByEmail(body.email);
    if (!user) {
      RateLimitingService.recordAttempt(ip);
      return NextResponse.json(
        {
          error: "Ungültige E-Mail oder Passwort",
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await AuthenticationService.comparePassword(
      body.password,
      user.password
    );

    if (!isPasswordValid) {
      RateLimitingService.recordAttempt(ip);
      return NextResponse.json(
        {
          error: "Ungültige E-Mail oder Passwort",
        },
        { status: 401 }
      );
    }

    // Check if user is active (optional: if you have isActive field)

    // Generate token (replace with JWT in production)
    // Alle Rollen aus allen user_organization_role-Einträgen sammeln
    const allRoles = Array.isArray(user.user_organization_role)
      ? user.user_organization_role.flatMap((uor) =>
          Array.isArray(uor.role)
            ? uor.role.map((ra) => ra.role?.name).filter(Boolean)
            : []
        )
      : [];

    const token = AuthenticationService.generateToken({
      _id: user.id,
      email: user.email,
      roles: allRoles,
    });

    // Update last login (optional: if you have lastLogin field)
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });
    } catch (e) {
      // ignore if field does not exist
    }

    // Reset rate limiting for successful login
    RateLimitingService.resetAttempts(ip);

    // Return success response
    const response = {
      message: "Anmeldung erfolgreich",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        roles: allRoles,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Fehler bei der Anmeldung:", error);
    return NextResponse.json(
      {
        error: "Interner Serverfehler",
      },
      { status: 500 }
    );
  }
}
