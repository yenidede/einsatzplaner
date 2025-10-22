'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import InviteUserForm from '@/features/invitations/components/InviteUserForm';

export default function InvitePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/signin');
            return;
        }

        // Berechtigung prüfen
        if (session.user.role !== 'Organisationsverwaltung' && session.user.role !== 'Einsatzverwaltung') {
            router.push('/helferansicht');
            return;
        }
    }, [session, status, router]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Lade...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Helfer einladen</h1>
                    <p className="mt-2 text-gray-600">
                        Laden Sie neue Helfer zu Ihrer Organisation ein
                    </p>
                </div>

                <InviteUserForm organizationName={(session.user as any).organizationName || 'Unbekannte Organisation'} />
            </div>
        </div>
    );
}
