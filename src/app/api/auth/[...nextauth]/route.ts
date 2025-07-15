// Code für die Authentifizierung mit NextAuth.js
import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import clientPromise from '@/lib/mongo/client';
import { User, userHelpers, USERS_COLLECTION } from '@/lib/mongo/models/User';

const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Passwort', type: 'password' }
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null;
                    }

                    // Validiere Login-Daten
                    const loginData = userHelpers.validateLogin(credentials);

                    // Verbinde zur Datenbank
                    const client = await clientPromise;
                    if (!client) {
                        throw new Error('Datenbankverbindung fehlgeschlagen');
                    }
                    const db = client.db();
                    const collection = db.collection<User>(USERS_COLLECTION);

                    // Finde User in der Datenbank
                    const user = await collection.findOne({ email: loginData.email });

                    if (!user) {
                        return null;
                    }

                    // Überprüfe Passwort
                    const isPasswordValid = await compare(loginData.password, user.password);

                    if (!isPasswordValid) {
                        return null;
                    }

                    // Überprüfe ob User aktiv ist
                    if (!user.isActive) {
                        return null;
                    }

                    // Gebe User ohne Passwort zurück
                    const sanitizedUser = userHelpers.sanitizeUser(user);
                    
                    return {
                        id: user._id!.toString(),
                        email: sanitizedUser.email,
                        name: `${sanitizedUser.firstname} ${sanitizedUser.lastname}`,
                        firstname: sanitizedUser.firstname,
                        lastname: sanitizedUser.lastname,
                        role: sanitizedUser.role,
                        isActive: sanitizedUser.isActive,
                        emailVerified: sanitizedUser.emailVerified || false,
                    };
                } catch (error) {
                    console.error('Login Fehler:', error);
                    return null;
                }
            }
        })
    ],
    session: {
        strategy: 'jwt',
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
                token.isActive = user.isActive;
                token.emailVerified = typeof user.emailVerified === 'boolean' ? user.emailVerified : false;
            }
            
            // ✅ Bei Session-Update die aktuellen Daten aus der DB holen
            if (trigger === 'update' && token.sub) {
                try {
                    const client = await clientPromise;
                    if (client) {
                        const db = client.db();
                        const collection = db.collection<User>(USERS_COLLECTION);
                        
                        // Aktuellen User aus DB laden
                        const currentUser = await collection.findOne({ 
                            _id: new (require('mongodb').ObjectId)(token.sub)
                        });
                        
                        if (currentUser) {
                            token.firstname = currentUser.firstname;
                            token.lastname = currentUser.lastname;
                            token.role = currentUser.role;
                            token.email = currentUser.email;
                            token.isActive = currentUser.isActive;
                            token.emailVerified = currentUser.emailVerified || false;
                        }
                    }
                } catch (error) {
                    console.error('Error refreshing user data:', error);
                }
            }
            
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.sub!;
                session.user.firstname = token.firstname as string;
                session.user.lastname = token.lastname as string;
                session.user.role = token.role as "Organisationsverwaltung" | "Einsatzverwaltung" | "Helfer";
                session.user.isActive = token.isActive as boolean;
                session.user.emailVerified = token.emailVerified as boolean;
                session.user.email = token.email as string;
                session.user.name = `${token.firstname} ${token.lastname}`;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            return `${baseUrl}/dashboard`;
        }
    },
    pages: {
        signIn: '/signin',
        error: '/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };