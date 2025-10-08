// Code für die Authentifizierung mit NextAuth.js
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { getUserForAuth, updateLastLogin } from "@/DataAccessLayer/user";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { Router } from "lucide-react";
const accessTokenTime =  60 * 15 * 1000; // 15 Minuten
const refreshTokenTime = 7 * 24 * 60 * 60 * 1000; // 7 Days
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
            picture_url: true
          }
        }
      },
    });

    console.log("Session found:", session);

    if (!session || !session.user) {
      console.log("No valid session found - refresh token expired or invalid");
      throw new Error("No valid session found");
    }
    if (session.user.id !== token.id) {
      console.log("Token user ID does not match session user ID");
      throw new Error("Token user ID mismatch");
    }

    const newRefreshToken = await generateRefreshToken(session.user.id);
    await prisma.user_session.delete({ where: { id: session.id } });

    return {
      ...token,
      id: session.user.id,
      email: session.user.email,
      firstname: session.user.firstname,
      lastname: session.user.lastname,
      picture_url: session.user.picture_url || undefined,
      refreshToken: newRefreshToken,
      accessTokenExpires: Date.now() + accessTokenTime,
      error: undefined
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
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

          if (!user) {
            return null;
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password || ''
          );

          if (!isPasswordValid) {
            return null;
          }

          await updateLastLogin(user.id);

          const refreshToken = await generateRefreshToken(user.id);
          
          return {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            picture_url: user.picture_url,
            refreshToken,
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
      if (user && account) {
        return {  
          ...token,
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          picture_url: user.picture_url || undefined,
          refreshToken: user.refresh_token,
          accessTokenExpires: Date.now() + accessTokenTime,
        };
      }

      if (token.error === "RefreshAccessTokenError") {
        console.log("Refresh token expired - user needs to re-login");
        return token;
      }

      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }
      
      return await refreshAccessToken(token);
    },

    async session({ session, token }) {
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
    maxAge: 7 * 24 * 60 * 60, // 7 Tage
    updateAge: 15 * 60, // 5 Minuten
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 Tage
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
