import { DefaultSession } from "next-auth";

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
    hasGetMailNotification: boolean;
    abbreviation: string | null;
};

type UserBase = {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    picture_url: string | null;
    phone: string | null;
    salutationId: string | null;
    /*   description: string | null; */
    hasLogoinCalendar: boolean;

    orgIds: string[];
    roleIds: string[];
    activeOrganization: {
        id: string;
        name: string;
        logo_url: string | null;
    }
};

type TokenInfo = {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    refreshTokenExpires: number;
    error?: "RefreshAccessTokenError";
};

declare module "next-auth" {
    interface User extends UserBase {
        accessToken: string;
        refreshToken: string;
        organizations: Organization[];
        roles: OrganizationRole[];
    }

    interface Session extends DefaultSession {
        user: UserBase;
        token: TokenInfo;
        error?: "RefreshAccessTokenError";
        expires: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends UserBase, TokenInfo {
        error?: "RefreshAccessTokenError";
    }
}
