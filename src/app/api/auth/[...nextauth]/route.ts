// Code für die Authentifizierung mit NextAuth.js
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import {
  getUserByIdWithOrgAndRole,
  getUserByEmail,
} from "@/DataAccessLayer/user";
import { UserRole } from "@/types/user";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // User inkl. Rollenbeziehung holen
          const user = await getUserByEmail(credentials.email);

          if (!user) {
            return null;
          }

          // Passwort prüfen
          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          // Rolle aus erster user_organization_role holen (falls vorhanden)
          const userOrgRole = user.user_organization_role[0];
          const role = userOrgRole?.roles?.name as UserRole | null;
          const orgId = userOrgRole?.organization?.id ?? null;

          // User-Objekt für Session zurückgeben (muss User-Typ entsprechen)
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstname ?? ""} ${user.lastname ?? ""}`,
            firstname: user.firstname ?? "",
            lastname: user.lastname ?? "",
            role: role,
            orgId: orgId,
          };
        } catch (error) {
          console.error("Login Fehler:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Tage
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 Tage
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.firstname = user.firstname;
        token.lastname = user.lastname;
        token.role = user.role;
        token.orgId = user.orgId;
        token.email = user.email;
      }

      // Bei Session-Update die aktuellen Daten aus der DB holen
      if (trigger === "update" && token.sub) {
        try {
          const currentUser = await getUserByIdWithOrgAndRole(token.sub!);

          if (currentUser) {
            token.firstname = currentUser.firstname ?? "";
            token.lastname = currentUser.lastname ?? "";
            const userOrgRole = currentUser.user_organization_role[0];
            token.role = userOrgRole?.roles?.name as UserRole;
            token.orgId = userOrgRole?.organization?.id ?? null;
            token.email = currentUser.email;
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.firstname = token.firstname as string;
        session.user.lastname = token.lastname as string;
        session.user.role = token.role as UserRole;
        session.user.orgId = token.orgId as string; // orgId ggf. als session.orgId speichern, nicht als session.user.orgId
        session.user.email = token.email as string;
        session.user.name = `${token.firstname} ${token.lastname}`;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
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
