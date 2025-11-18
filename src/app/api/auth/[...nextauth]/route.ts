import NextAuth, { NextAuthOptions, Session, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { updateLastLogin } from "@/DataAccessLayer/user";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose";
import { JWT } from "next-auth/jwt";

const ACCESS_TOKEN_LIFETIME = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-as-backup"
);

async function generateAccessToken(userData: {
  id: string;
  email: string;
  firstname: string | null;
  lastname: string | null;
  picture_url: string | null;
}): Promise<string> {
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

  await prisma.user_session
    .deleteMany({
      where: { user_id: userId, expires_at: { lt: new Date() } },
    })
    .catch((err) => console.error("Cleanup error:", err));

  await prisma.user_session.create({
    data: {
      user_id: userId,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_LIFETIME),
    },
  });

  return refreshToken;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken) {
      throw new Error("No refresh token available");
    }

    const session = await prisma.user_session.findFirst({
      where: {
        refresh_token: token.refreshToken,
        expires_at: { gt: new Date() },
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
            salutationId: true,
            /* description: true, */
            hasLogoinCalendar: true,
          },
        },
      },
    });

    if (!session?.user || !session.expires_at) {
      throw new Error("Invalid or expired refresh token");
    }

    const user_organization_role = await prisma.user_organization_role.findMany(
      {
        where: { user_id: session.user.id },
        select: {
          org_id: true,
          role_id: true,
        },
      }
    );

    const orgIds = [
      ...new Set(user_organization_role.map((uor) => uor.org_id)),
    ];
    const roleIds = [
      ...new Set(user_organization_role.map((uor) => uor.role_id)),
    ];

    const newAccessToken = await generateAccessToken({
      id: session.user.id,
      email: session.user.email,
      firstname: session.user.firstname,
      lastname: session.user.lastname,
      picture_url: session.user.picture_url,
    });

    return {
      ...token,
      id: session.user.id,
      email: session.user.email,
      firstname: session.user.firstname ?? null,
      lastname: session.user.lastname ?? null,
      picture_url: session.user.picture_url,
      phone: session.user.phone,
      salutationId: session.user.salutationId,
      /* description: session.user.description, */

      hasLogoinCalendar: session.user.hasLogoinCalendar ?? false,
      orgIds,
      roleIds,
      activeOrganizationId: token.activeOrganization.id ?? orgIds[0] ?? null,
      accessToken: newAccessToken,
      accessTokenExpires: Date.now() + ACCESS_TOKEN_LIFETIME * 1000,
      refreshToken: token.refreshToken,
      refreshTokenExpires: session.expires_at.getTime(),
      error: undefined,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);

    if (token.id) {
      await prisma.user_session
        .deleteMany({
          where: { user_id: token.id as string },
        })
        .catch((err) => console.error("Cleanup error:", err));
    }

    return {
      ...token,
      error: "RefreshAccessTokenError",
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
      async authorize(credentials): Promise<User | null> {
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
              salutationId: true,
              phone: true,
              /* description: true, */
              hasLogoinCalendar: true,
              active_org: true,
            },
          });

          if (!user || !user.password) {
            console.error("User not found or password missing");
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );
          if (!isPasswordValid) {
            return null;
          }

          const [user_organization_role] = await Promise.all([
            prisma.user_organization_role.findMany({
              where: { user_id: user.id },
              select: {
                org_id: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    logo_url: true,
                  }
                },
                role_id: true,
              },
            }),
            updateLastLogin(user.id),
          ]);

          const orgIds = [
            ...new Set(user_organization_role.map((uor) => uor.org_id)),
          ];
          const roleIds = [
            ...new Set(user_organization_role.map((uor) => uor.role_id)),
          ];

          const [accessToken, refreshToken] = await Promise.all([
            generateAccessToken({
              id: user.id,
              email: user.email,
              firstname: user.firstname,
              lastname: user.lastname,
              picture_url: user.picture_url,
            }),
            generateRefreshToken(user.id),
          ]);

          return {
            id: user.id,
            email: user.email,
            firstname: user.firstname ?? "",
            lastname: user.lastname ?? "",
            picture_url: user.picture_url,
            phone: user.phone,
            salutationId: user.salutationId,
            /* description: user.description, */
            hasLogoinCalendar: user.hasLogoinCalendar ?? false,
            orgIds,
            roleIds,
            organizations: [],
            roles: [],
            activeOrganization:
              user_organization_role.find(uor => uor.org_id === user.active_org)?.organization
              || user_organization_role[0]?.organization,
            accessToken,
            refreshToken,
          } as User;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }): Promise<JWT> {
      // Initial sign in
      if (user && account) {
        return {
          ...token,
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          picture_url: user.picture_url,
          phone: user.phone,
          hasLogoinCalendar: user.hasLogoinCalendar,
          orgIds: user.orgIds,
          roleIds: user.roleIds,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + ACCESS_TOKEN_LIFETIME * 1000,
          refreshTokenExpires: Date.now() + REFRESH_TOKEN_LIFETIME,
        };
      }

      // Session update triggered
      if (trigger === "update" && session) {
        return {
          ...token,
          firstname: session.user?.firstname ?? token.firstname,
          lastname: session.user?.lastname ?? token.lastname,
          picture_url: session.user?.picture_url ?? token.picture_url,
          email: session.user?.email ?? token.email,
          phone: session.user?.phone ?? token.phone,
          salutationId: session.user?.salutationId ?? token.salutationId,
          /* description: session.user?.description ?? token.description, */
          hasLogoinCalendar:
            session.user?.hasLogoinCalendar ?? token.hasLogoinCalendar,
          activeOrganizationId:
            session.user?.activeOrganizationId ?? token.activeOrganizationId,
        };
      }

      // Check for refresh error
      if (token.error === "RefreshAccessTokenError") {
        return token;
      }

      // Check if token needs refresh
      const now = Date.now();
      const expiresAt = token.accessTokenExpires as number;

      if (now < expiresAt) {
        // If token expires in more than 3 minutes, no refresh needed
        if (expiresAt - now > 3 * 60 * 1000) {
          return token;
        }
      }

      // Refresh token
      return await refreshAccessToken(token);
    },

    async session({ session, token }): Promise<Session> {
      if (token.error === "RefreshAccessTokenError") {
        return {
          ...session,
          error: "RefreshAccessTokenError",
          expires: new Date(0).toISOString(),
        } as Session;
      }

      session.token = {
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string,
        accessTokenExpires: token.accessTokenExpires as number,
        refreshTokenExpires: token.refreshTokenExpires as number,
      };

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.firstname = (token.firstname as string | null) ?? "";
        session.user.lastname = (token.lastname as string | null) ?? "";
        session.user.picture_url = (token.picture_url as string | null) ?? null;
        session.user.phone = (token.phone as string | null) ?? null;
        session.user.salutationId =
          (token.salutationId as string | null) ?? null;
        session.user.hasLogoinCalendar =
          (token.hasLogoinCalendar as boolean) ?? false;

        session.user.orgIds = (token.orgIds as string[]) ?? [];
        session.user.roleIds = (token.roleIds as string[]) ?? [];
        session.user.activeOrganizationId =
          (token.activeOrganizationId as string | null) ?? null;
      }

      return session;
    },
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
