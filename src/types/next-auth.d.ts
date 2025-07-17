import { UserRole } from '@/types/user';
import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        name: string;
        firstname: string;
        lastname: string;
        role: UserRole;
        orgId: string | null;
    }

    interface Session {
        user: User;
        orgId?: string | null;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        firstname: string;
        lastname: string;
        role: UserRole;
        orgId: string | null;
        email: string;
    }
}
