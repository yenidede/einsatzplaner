import { env } from "./environment";

export const authConfig = {
    secret: env.auth.secret,
    sessionMaxAge: env.auth.sessionMaxAge,
    debug: env.auth.debug,
    
    pages: {
        signIn: '/signin',
        error: '/signin',
        signUp: '/signup',
    },
    
    // Environment-spezifische Einstellungen
    ...(env.isProduction && {
        secure: true,
        sameSite: 'lax' as const,
        httpOnly: true,
    }),
    
    // Test-spezifische Einstellungen
    ...(env.isTest && {
        sessionMaxAge: 5 * 60, // 5 Minuten für Tests
        pages: {
            signIn: '/test-signin',
            error: '/test-error',
        }
    })
};
