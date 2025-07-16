'use client';

import { useSession } from 'next-auth/react';
import UserSettings from '@/features/auth/components/UserSettings';
import { AuthServiceProvider, ProductionAuthFactory } from '@/features/auth/factories/AuthServiceFactory';

export default function FactorySettingsPage() {
    const { data: session } = useSession();

    if (!session?.user) {
        return <div>Bitte anmelden</div>;
    }

    // Factory Pattern verwenden
    const userService = AuthServiceProvider.getUserService();
    const validator = AuthServiceProvider.getValidator();

    const userData = {
        email: session.user.email || '',
        firstname: session.user.name?.split(' ')[0] || '',
        lastname: session.user.name?.split(' ')[1] || ''
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Einstellungen (Factory Pattern)</h1>
            
            <UserSettings 
                userId={session.user.id || ''}
                initialData={userData}
                userService={userService}
                validator={validator}
            />
        </div>
    );
}
