'use client'

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';  // ✅ Geändert!
import { useEffect, useState } from 'react';




export default function DashboardPage() {
    const router = useRouter();
    const { data: session, status } = useSession({
        required: true,  // Erfordert eine Session, sonst wird automatisch umgeleitet
        fetchPolicy: 'network-only',  // Stellt sicher, dass die neueste Session geladen wird
        onUnauthenticated() {
            // Redirect to sign-in page if unauthenticated
            router.push('/signin');
        }
    });
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

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
                            onClick={() => {
                                    signOut({ callbackUrl: '/signin' });
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                        >
                            Logout
                        </button>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold text-blue-900">Willkommen</h3>
                        <p className="text-blue-700">
                            Hallo, {session.user.firstname} {session.user.lastname}!
                        </p>
                        <p className="text-sm text-blue-600">
                            Rolle: {session.user.role}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
