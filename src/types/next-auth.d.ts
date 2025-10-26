import { UserRole } from '@/types/user';
import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        firstname?: string;
        lastname?: string;
        role: UserRole;
        orgId: string | null;
        roleId: string | null;
        phone?: string;
        initials: string;
        picture_url?: string | null;
        description?: string;
        refreshToken: string;
        accessToken: string;
        hasLogoinCalendar?: boolean;
        updated_at?: Date;
        created_at?: Date;
        // Multi-Role/Org Unterstützung
        roles?: string[];
        roleIds?: string[];
        orgIds?: string[];
    }

    interface Session {     
        user: {
            id: string;
            email: string;
            name?: string;
            image?: string;
            firstname?: string;
            lastname?: string;
            picture_url?: string;
            phone?: string;
            description?: string;
            hasLogoinCalendar?: boolean;
            organizations?: Array<{
                organization: {
                    id: string;
                    name: string;
                    helper_name_singular: string;
                    helper_name_plural: string;
                }
                role: {
                    id: string;
                    name: string;
                    abbreviation: string;
                }
            }>;
        }
        error?: string;
        orgId?: string | null;
        roleId?: string | null;
        // Multi-Role/Org Unterstützung
        orgIds?: string[];
        roleIds?: string[];
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        firstname?: string;
        lastname?: string;
        picture_url?: string;
        phone?: string;
        description?: string;
        hasLogoinCalendar?: boolean;
        organizations?: any[];
        accessTokenExpires: number;
        refreshToken?: string;
        error?: string;
    }
}
