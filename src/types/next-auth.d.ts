import { UserRole } from '@/types/user';
import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        firstname: string;
        lastname: string;
        role: UserRole;
        orgId: string | null;
        phone: string | null;
        initials: string; // Assuming you have a way to generate initials
        picture_ur?: string | null;
        picture_url?: string | null;
        last_login
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
