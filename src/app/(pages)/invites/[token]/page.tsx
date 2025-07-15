import { notFound } from 'next/navigation';
import AcceptInviteForm from '@/features/invitations/components/AcceptInviteForm';

interface InvitePageProps {
    params: Promise<{
        token: string;
    }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;

    if (!token) {
        notFound();
    }

    // Einladungsdaten laden
    let invitationData = null;
    try {
        const response = await fetch(`${process.env.NEXTAUTH_URL}/api/invitations/accept?token=${token}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            invitationData = data.invitation;
        }
    } catch (error) {
        console.error('Error loading invitation:', error);
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Einladung annehmen</h1>
                    <p className="mt-2 text-gray-600">
                        Vervollständigen Sie Ihre Registrierung
                    </p>
                </div>

                <AcceptInviteForm 
                    token={token}
                    invitationData={invitationData}
                />
            </div>
        </div>
    );
}
