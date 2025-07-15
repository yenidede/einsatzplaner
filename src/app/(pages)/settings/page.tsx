
import UserSettingsSimple from '@/features/auth/components/UserSettingsSimple';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
    // Session prüfen
    const session = await getServerSession();
    if (!session?.user) {
        redirect('/signin');
    }

    // Userdaten über API holen
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/settings?userId=${session.user.id}`);
    if (!res.ok) {
        return <div>Benutzer nicht gefunden</div>;
    }
    const user = await res.json();
    const userData = {
        _id: session.user.id || '',
        email: user.email || '',
        firstname: user.firstname || '',
        lastname: user.lastname || '',
    };
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
                    <p className="mt-2 text-gray-600">
                        Verwalten Sie Ihre Kontodaten und Sicherheitseinstellungen
                    </p>
                </div>

                <UserSettingsSimple 
                    userId={session.user.id || ''}
                    initialData={userData}
                />
            </div>
        </div>
    );
}
