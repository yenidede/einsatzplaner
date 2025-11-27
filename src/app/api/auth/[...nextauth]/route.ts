import NextAuth, { NextAuthOptions, Session, User } from "next-auth";
import { authOptions } from "@/lib/auth.config";

// overhauled to use authOptions from a central config file instead of redefining it here
// as it was/is only possible to export the handler in nextauth route file
// find the authOptions in src/lib/auth.config.ts

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
