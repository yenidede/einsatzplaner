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
        roleId: string | null;
        phone: string | null;
        initials: string;
        picture_url?: string | null;
        // Multi-Role/Org Unterstützung
        roles?: string[];
        roleIds?: string[];
        orgIds?: string[];
    }

    interface Session {     
        user: User;
        orgId?: string | null;
        roleId?: string | null;
        // Multi-Role/Org Unterstützung
        orgIds?: string[];
        roleIds?: string[];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        firstname: string;
        lastname: string;
        role: UserRole;
        orgId: string | null;
        roleId: string | null;
        email: string;
        // Multi-Role/Org Unterstützung
        roles?: string[];
        roleIds?: string[];
        orgIds?: string[];
    }
}
