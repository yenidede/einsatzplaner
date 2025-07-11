import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        name: string;
        firstname: string;
        lastname: string;
        role: string;
        isActive: boolean;
        emailVerified: boolean;
    }

    interface Session {
        user: {
            id: string;
            email: string;
            name: string;
            firstname: string;
            lastname: string;
            role: string;
            isActive: boolean;
            emailVerified: boolean;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        firstname: string;
        lastname: string;
        role: string;
        isActive: boolean;
        emailVerified: boolean;
    }
}
