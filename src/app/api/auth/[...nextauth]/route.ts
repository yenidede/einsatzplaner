import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getUserForAuth, updateLastLogin } from "@/DataAccessLayer/user";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose";

const ACCESS_TOKEN_LIFETIME = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-as-backup"
);

async function generateAccessToken( userData: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const jwt = await new SignJWT({
    sub: userData.id,
    email: userData.email,
    firstname: userData.firstname,
    lastname: userData.lastname,
    picture_url: userData.picture_url,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_LIFETIME)
    .setJti(crypto.randomUUID())
    .sign(JWT_SECRET);
  
  return jwt;
}

async function generateRefreshToken(userId: string): Promise<string> {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  
  await prisma.user_session.deleteMany({
    where: { user_id: userId, expires_at: { lt: new Date() } }
  }).catch(err => console.error("Cleanup error:", err));

  await prisma.user_session.create({
    data: {
      user_id: userId,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_LIFETIME),
    },
  });

  return refreshToken;
}

async function refreshAccessToken(token: any) {
  try {
    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const session = await prisma.user_session.findFirst({
      where: { 
        refresh_token: token.refreshToken,
        expires_at: { gt: new Date() }
      },
      include: { 
        user: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
            picture_url: true,
            phone: true,
            description: true,
            hasLogoinCalendar: true,
          }
        }
      },
    });

    if (!session?.user || !session.expires_at) {
      throw new Error("Invalid or expired refresh token");
    }

    const newAccessToken = await generateAccessToken(session.user);

    return {
      ...token,
      email: session.user.email,
      firstname: session.user.firstname,
      lastname: session.user.lastname,
      picture_url: session.user.picture_url,
      phone: session.user.phone,
      description: session.user.description,
      hasLogoinCalendar: session.user.hasLogoinCalendar,
      accessToken: newAccessToken,
      accessTokenExpires: Date.now() + (ACCESS_TOKEN_LIFETIME * 1000),
      refreshToken: token.refreshToken,
      refreshTokenExpires: session.expires_at.getTime(),
      error: undefined,
      organizations: token.organizations,
      roles: token.roles,
      orgIds: token.orgIds,
      roleIds: token.roleIds,
      activeOrganizationId: token.activeOrganizationId,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    
    if (token.id) {
      await prisma.user_session.deleteMany({
        where: { user_id: token.id }
      }).catch(err => console.error("Cleanup error:", err));
    }
    
    return { 
      ...token,
      error: "RefreshAccessTokenError"
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              password: true,
              firstname: true,
              lastname: true,
              picture_url: true,
              phone: true,
              description: true,
              hasLogoinCalendar: true,
            }
          });

          if (!user || !user.password) {
            console.error("User not found or password missing");
            return null;
          }

          const isPasswordValid = await compare(credentials.password, user.password);
          if (!isPasswordValid) {
            return null;
          }

          const [user_organization_role] = await Promise.all([
            prisma.user_organization_role.findMany({
              where: { user_id: user.id },
              select: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    helper_name_singular: true,
                    helper_name_plural: true,
                  }
                },
                role: {
                  select: {
                    id: true,
                    name: true,
                    abbreviation: true,
                  }
                }
              }
            }),
            updateLastLogin(user.id)
          ]);

          const organizationsMap = new Map();
          user_organization_role.forEach(uor => {
            if (!organizationsMap.has(uor.organization.id)) {
              organizationsMap.set(uor.organization.id, {
                id: uor.organization.id,
                name: uor.organization.name,
                helper_name_singular: uor.organization.helper_name_singular ?? "Helfer",
                helper_name_plural: uor.organization.helper_name_plural ?? "Helfer",
              });
            }
          });

          const roles = user_organization_role.map(uor => ({
            orgId: uor.organization.id,
            roleId: uor.role.id,
            roleName: uor.role.name,
            roleAbbreviation: uor.role.abbreviation,
          }));

          const organizations = Array.from(organizationsMap.values());
          const orgIds = organizations.map(org => org.id);
          const roleIds = [...new Set(roles.map(r => r.roleId))];

          const [accessToken, refreshToken] = await Promise.all([
            generateAccessToken(user),
            generateRefreshToken(user.id)
          ]);

          
          return {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            picture_url: user.picture_url,
            phone: user.phone,
            description: user.description,
            hasLogoinCalendar: user.hasLogoinCalendar ?? false,
            organizations,
            roles,
            orgIds,
            roleIds,
            accessToken,
            refreshToken,
            activeOrganizationId: orgIds[0] || null,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user && account) {
        return {  
          ...token,
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          picture_url: user.picture_url,
          phone: user.phone,
          description: user.description,
          hasLogoinCalendar: user.hasLogoinCalendar,
          organizations: user.organizations,
          roles: user.roles,
          orgIds: user.organizations.map((org) => org.id),
          roleIds: user.roles.map((role) => role.roleId),
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + (ACCESS_TOKEN_LIFETIME * 1000),
          refreshTokenExpires: Date.now() + REFRESH_TOKEN_LIFETIME,
          activeOrganizationId: user.activeOrganizationId,
        };
      }

      if (trigger === "update" && session) {
        return {
          ...token,
          firstname: session.user?.firstname ?? token.firstname,
          lastname: session.user?.lastname ?? token.lastname,
          picture_url: session.user?.picture_url ?? token.picture_url,
          email: session.user?.email ?? token.email,
          phone: session.user?.phone ?? token.phone,
          description: session.user?.description ?? token.description,
          hasLogoinCalendar: session.user?.hasLogoinCalendar ?? token.hasLogoinCalendar,
          activeOrganizationId: session.user?.activeOrganizationId ?? token.activeOrganizationId,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          accessTokenExpires: token.accessTokenExpires,
          refreshTokenExpires: token.refreshTokenExpires,
        };
      }

      if (token.error === "RefreshAccessTokenError") {
        return token;
      }

      const now = Date.now();
      const expiresAt = token.accessTokenExpires as number;
      
      if (now < expiresAt) {
        if (expiresAt - now > 3 * 60 * 1000) {
          return token;
        }
      }
      
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (token.error === "RefreshAccessTokenError") {
        return {
          ...session,
          error: "RefreshAccessTokenError",
          expires: new Date(0).toISOString(),
        };
      }

      session.token = {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        accessTokenExpires: token.accessTokenExpires,
        refreshTokenExpires: token.refreshTokenExpires,
      };

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.picture_url = (token.picture_url as string | null) ?? null;
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.description = (token.description as string | null) ?? null;
        session.user.hasLogoinCalendar = (token.hasLogoinCalendar as boolean) ?? false;
        session.user.organizations = (token.organizations as any[]) ?? [];
        session.user.roles = (token.roles as any[]) ?? [];
        session.user.orgIds = (token.orgIds as string[]) ?? [];
        session.user.roleIds = (token.roleIds as string[]) ?? [];
        session.user.activeOrganizationId = (token.activeOrganizationId as string | null) ?? null;
      }
      
      return session;
    }
  },

  session: {
    strategy: "jwt",
    maxAge: REFRESH_TOKEN_LIFETIME / 1000,
    updateAge: 15 * 60,
  },
  
  jwt: {
    maxAge: REFRESH_TOKEN_LIFETIME / 1000,
  },
  
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };