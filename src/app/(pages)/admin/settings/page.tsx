import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import UserSettings from '@/features/auth/components/UserSettings';
import { UserService, FetchHttpClient } from '@/features/auth/services/UserService';
import { UserFormValidator } from '@/features/auth/validators/UserValidator';

export default async function AdminSettingsPage() {
    const session = await getServerSession();
    
    if (!session?.user) {
        redirect('/signin');
    }

    // Custom HTTP Client mit Admin-Endpunkten
    const adminHttpClient = new FetchHttpClient('/api/admin');
    const adminUserService = new UserService(adminHttpClient);
    
    // Custom Validator mit strengeren Regeln
    const strictValidator = new UserFormValidator();
    
    const userData = {
        email: session.user.email || '',
        firstname: session.user.name?.split(' ')[0] || '',
        lastname: session.user.name?.split(' ')[1] || ''
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Einstellungen</h1>
                    <p className="mt-2 text-gray-600">
                        Erweiterte Kontoverwaltung für Administratoren
                    </p>
                </div>

                <UserSettings 
                    userId={session.user.id || ''}
                    initialData={userData}
                    userService={adminUserService}
                    validator={strictValidator}
                />
            </div>
        </div>
    );
}
