type Organization = {
    id: string;
    name: string;
    helper_name_singular: string;
    helper_name_plural: string;
};
type OrganizationRole = {
    orgId: string;
    roleId: string;
    roleName: string;
    abbreviation: string | null;
};

type UserBase = {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    picture_url: string | null;
    phone: string | null;
    description: string | null;
    hasLogoinCalendar: boolean;
    organizations: Organization[];
    roles: OrganizationRole[];
    orgIds: string[];
    roleIds: string[];
    activeOrganizationId: string | null;
};

type TokenInfo = {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    refreshTokenExpires: number;

}

declare module 'next-auth' {
    interface User extends UserBase {
        accessToken?: string;
        refreshToken?: string;
    }

    interface Session {
        user: UserBase;
        token: TokenInfo;
        error?: 'RefreshAccessTokenError';
        expires: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT extends UserBase, TokenInfo {
        error?: 'RefreshAccessTokenError';
    }
}
