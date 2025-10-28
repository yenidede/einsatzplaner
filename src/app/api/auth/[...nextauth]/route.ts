import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getUserForAuth, updateLastLogin } from "@/DataAccessLayer/user";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose"; 


const ACCESS_TOKEN_LIFETIME = 15 * 60 ; // 5 Minuten (in Millisekunden)
const REFRESH_TOKEN_LIFETIME = 7 * 24 * 60 * 60 * 1000; // 7 Tage (in Millisekunden)

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-as-backup"
);

async function generateAccessToken(userId: string, userData: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const jwt = await new SignJWT({
    sub: userId, 
    email: userData.email,
    firstname: userData.firstname,
    lastname: userData.lastname,
    picture_url: userData.picture_url,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" }) 
    .setExpirationTime(now + ACCESS_TOKEN_LIFETIME)
    .setJti(crypto.randomUUID()) 
    .sign(JWT_SECRET);
  return jwt;
}

async function generateRefreshToken(userId: string): Promise<string> {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  
  await prisma.user_session.deleteMany({
    where: { user_id: userId }
  });

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
    //console.log("Refreshing access token...");

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
          }
        }
      },
    });

    if (!session || !session.user) {
      throw new Error("Invalid or expired refresh token");
    }

    const newAccessToken = await generateAccessToken(session.user.id, session.user);

    //console.log("Access token refreshed successfully");
    if (!session.expires_at) {
      throw new Error("Session expiration date is missing");
    }
    return {
      ...token,
      id: session.user.id,
      email: session.user.email,
      firstname: session.user.firstname,
      lastname: session.user.lastname,
      picture_url: session.user.picture_url,
      phone: session.user.phone,
      accessToken: newAccessToken,
      refreshToken: token.refreshToken, 
      accessTokenExpires: Date.now() + (ACCESS_TOKEN_LIFETIME * 1000),
      refreshTokenExpires: session.expires_at.getTime(),
      error: undefined,
    };
  } catch (error) {
    console.error("❌ Error refreshing access token:", error);
    
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
          const user = await getUserForAuth(credentials.email);
          if (!user) return null;

          const isPasswordValid = await compare(
            credentials.password,
            user.password || ''
          );
          if (!isPasswordValid) return null;

          await updateLastLogin(user.id);

          const refreshToken = await generateRefreshToken(user.id);
          const accessToken = await generateAccessToken(user.id, {
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            picture_url: user.picture_url,
          });
          
          return {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            picture_url: user.picture_url,
            phone: user.phone,
            refreshToken,
            accessToken, 
          };
        } catch (error) {
          console.error("❌ Authentication error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (user && account) {
        //console.log("Creating initial JWT token for user:", user.id);
        
        return {  
          ...token,
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          picture_url: user.picture_url,
          phone: user.phone,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + (ACCESS_TOKEN_LIFETIME * 1000),
          refreshTokenExpires: Date.now() + REFRESH_TOKEN_LIFETIME,
        };
      }

      if (trigger === "update" && session) {
        //console.log("Manual session update (UI data only)");

        return {
          ...token,

          firstname: session.user?.firstname || token.firstname,
          lastname: session.user?.lastname || token.lastname,
          picture_url: session.user?.picture_url ?? token.picture_url,
          email: session.user?.email || token.email,
          phone: session.user?.phone || token.phone,

          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          accessTokenExpires: token.accessTokenExpires,
          refreshTokenExpires: token.refreshTokenExpires,
        };
      }

      // Refresh Token Error
      if (token.error === "RefreshAccessTokenError") {
        //console.log("Refresh token expired - user needs to re-login");
        return token;
      }

      // Access Token Expiration Check
      const now = Date.now();
      const expiresAt = token.accessTokenExpires as number;
      
      if (now < expiresAt) {
        // Token noch gültig für > 3 Minute?
        if (expiresAt - now > 3 * 60 * 1000) {
          return token;
        }
        
        //console.log("Access token expires soon, refreshing...");
      } else {
        //console.log("Access token expired, refreshing...");
      }
      
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      if (token.error === "RefreshAccessTokenError") {
        //console.log("Session expired - redirecting to login");
        return {
          ...session,
          error: "RefreshAccessTokenError",
          expires: new Date(0).toISOString(),
        };
      }

      (session as any).token = {
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
        session.user.picture_url = (token.picture_url as string) ?? null;
        session.user.phone = token.phone as string;
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