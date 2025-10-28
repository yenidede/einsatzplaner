import { UserRole } from '@/types/user';
import { extend } from 'lodash';
import { RefreshCcw, RefreshCcwDot } from 'lucide-react';
import NextAuth from 'next-auth';

type Organization = {
    id: string;
    name: string;
    helper_name_singular: string;
    helper_name_plural: string;
};
type OrganizationRole = {
    organization: Organization;
    id: string;
    name: string;
    abbreviation: string;
};

type UserBase = {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    picture_url?: string | null;
    phone: string | null;
    description: string | null;
    hasLogoinCalendar: boolean;
    roles: UserRole[];
    organizations: Organization[];
    activeOrganizationId: string | null;

};

type TokenInfo = {
    accessToken: string;
    accessTokenExpires: number;
    refreshToken?: string;
    refreshTokenExpires?: number;

}

declare module 'next-auth' {
    interface User extends UserBase {
        accessToken?: string;
        refreshToken?: string;
    }

    interface Session {
        user: UserBase & {
            organizations?: Organization[];
            roles: OrganizationRole[];
        };
        token: TokenInfo;
        error?: 'RefreshAccessTokenError';
        expires: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT extends UserBase, TokenInfo {
        lastRefresh: number;
        error?: 'RefreshAccessTokenError';
    }
}
