// Code für die Authentifizierung mit NextAuth.js
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getUserForAuth, updateLastLogin } from "@/DataAccessLayer/user";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const accessTokenTime = 60 * 30 * 1000; // 30 Minuten
const refreshTokenTime = 7 * 24 * 60 * 60 * 1000; // 7 Days

async function generateAccessToken(userId: string): Promise<string> {
  return `access_${userId}_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
}

async function generateRefreshToken(userId: string): Promise<string> {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  await prisma.user_session.create({
    data: {
      user_id: userId,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + refreshTokenTime),
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
      include: { user: true },
    });

    if (!session || !session.user) {
      throw new Error("No valid session found");
    }

    const newAccessToken = await generateAccessToken(session.user.id);
    

    return {
      ...token,
      accessToken: newAccessToken,           
      refreshToken: token.refreshToken,      
      accessTokenExpires: Date.now() + accessTokenTime,
      refreshTokenExpires: token.refreshTokenExpires, 
    };
  } catch (error) {
    console.error("❌ Error refreshing access token:", error);
    
    if (token.id) {
      await prisma.user_session.deleteMany({
        where: { user_id: token.id }
      });
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

          // ✅ Generiere BEIDE Tokens beim Login
          const refreshToken = await generateRefreshToken(user.id);
          const accessToken = await generateAccessToken(user.id);
          
          return {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            picture_url: user.picture_url,
            refreshToken,
            accessToken,  // ✅ Access Token hinzugefügt
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user && account) {
        return {  
          ...token,
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          picture_url: user.picture_url || undefined,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: Date.now() + accessTokenTime,
          refreshTokenExpires: Date.now() + refreshTokenTime,
        };
      }

      // Wenn Refresh Token Error, nicht weiter versuchen
      if (token.error === "RefreshAccessTokenError") {
        console.log("Refresh token expired - user needs to re-login");
        return token;
      }

      // Access Token noch gültig? Return ohne Refresh
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }
      
      // Access Token abgelaufen → Refresh
      console.log("⏰ Access token expired, refreshing...");
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
      // ✅ Tokens in Session verfügbar machen
      (session as any).token = {
        accessToken: (token as any).accessToken,
        refreshToken: (token as any).refreshToken,
        accessTokenExpires: (token as any).accessTokenExpires,
        refreshTokenExpires: (token as any).refreshTokenExpires,
      };

      // Wenn Refresh Token Error, markiere Session als abgelaufen
      if (token.error === "RefreshAccessTokenError") {
        console.log("Session expired - redirecting to login");
        return {
          ...session,
          error: "RefreshAccessTokenError"
        };
      }

      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.picture_url = token.picture_url as string;
      }
      
      return session;
    }
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 15 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
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