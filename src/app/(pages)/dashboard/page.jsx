'use client'

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';  // ✅ Geändert!
import { useEffect, useState } from 'react';
import Link from 'next/link';



export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status, update } = useSession({
        required: true,  // Erfordert eine Session, sonst wird automatisch umgeleitet
        onUnauthenticated() {
            // Redirect to sign-in page if unauthenticated
            router.push('/signin');
        }
    });
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // ✅ Session beim Fokus des Fensters aktualisieren
    useEffect(() => {
        const handleFocus = async () => {
            if (session) {
                await update();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [session, update]);

    // ✅ Session alle 30 Sekunden aktualisieren
    useEffect(() => {
        const interval = setInterval(async () => {
            if (session) {
                await update();
            }
        }, 30000); // 30 Sekunden

        return () => clearInterval(interval);
    }, [session, update]);

    if (!isClient || status === 'loading') {
        // Loading state
        return <></>
    } 
    

    // Erfolgreich eingeloggt
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <button 
                            onClick={() => update()}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Aktualisieren
                        </button>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg mb-6">
                        <h3 className="font-semibold text-blue-900">Willkommen</h3>
                        <p className="text-blue-700">
                            Hallo, {session.user.firstname} {session.user.lastname}!
                        </p>
                        <p className="text-sm text-blue-600">
                            Rolle: {session.user.role}
                        </p>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Einladungs-Button nur für berechtigte Benutzer */}
                        {(session.user.role === 'Organisationsverwaltung' || session.user.role === 'Einsatzverwaltung') && (
                            <Link 
                                href="/admin/invite" 
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Helfer einladen
                            </Link>
                        )}
                        
                        <Link 
                            href="/settings" 
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Einstellungen
                        </Link>
                        
                        <button 
                            onClick={() => signOut({ callbackUrl: '/signin' })}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Abmelden
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
