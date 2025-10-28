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
        orgIds?: string[];
        organizations?: any[];
        roles?: any[];
        description?: string;
        refreshToken: string;
        accessToken: string;
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
            orgIds: string[];
            roles?: any[];

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
        orgIds?: string[];
        organizations?: any[];
        roles?: any[];
        organizations?: any[];
        accessTokenExpires: number;
        refreshToken?: string;
        error?: string;
    }
}
