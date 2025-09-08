import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

interface AcceptPageProps {
  params: Promise<{ token: string }> // <-- Promise hinzugefügt
}

export default async function AcceptPage({ params }: AcceptPageProps) {
  // Params awaiten
  const { token } = await params; // <-- await hinzugefügt
  
  const session = await getServerSession(authOptions);
  
  // Erst die Einladung suchen um zu sehen für welche E-Mail sie ist
  const invitation = await prisma.invitation.findFirst({
    where: {
      token: token, // <-- params.token zu token geändert
      accepted: false,
      expires_at: { gt: new Date() }
    },
    include: {
      organization: true,
      role: true,
      user: {
        select: {
          firstname: true,
          lastname: true
        }
      }
    }
  });

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Einladung nicht gefunden</h1>
          <p className="text-gray-600 mb-6">
            Die Einladung ist ungültig, bereits akzeptiert oder abgelaufen.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Zum Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (!session?.user?.email) {
    // Nicht angemeldet - zur Login-Seite mit Callback
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/api/invitations/${token}/accept`)}`);
  }

  // Prüfen ob angemeldete E-Mail mit Einladungs-E-Mail übereinstimmt
  if (session.user.email !== invitation.email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Falsche E-Mail-Adresse</h1>
          <p className="text-gray-600 mb-4">
            Sie sind als <strong>{session.user.email}</strong> angemeldet.
          </p>
          <p className="text-gray-600 mb-4">
            Diese Einladung ist aber für <strong>{invitation.email}</strong>.
          </p>
          <p className="text-gray-600 mb-6">
            Bitte melden Sie sich mit der richtigen E-Mail-Adresse an.
          </p>
          <div className="space-y-3">
            <a
              href={`/signout?callbackUrl=${encodeURIComponent(`/api/invitations/${token}/accept`)}`}
              className="block w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 font-medium"
            >
              Abmelden und richtige E-Mail verwenden
            </a>
            <a
              href="/dashboard"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200"
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Ab hier: User ist angemeldet UND hat die richtige E-Mail
  // Automatische Akzeptierung
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      throw new Error('Benutzer nicht gefunden');
    }

    // Prüfen ob bereits Mitglied
    const existingRole = await prisma.user_organization_role.findFirst({
      where: {
        user_id: user.id,
        org_id: invitation.org_id
      }
    });

    if (!existingRole) {
      // Einladung automatisch akzeptieren
      await prisma.$transaction(async (tx) => {
        await tx.user_organization_role.create({
          data: {
            user_id: user.id,
            org_id: invitation.org_id,
            role_id: invitation.role_id
          }
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { accepted: true }
        });
      });
    }

    // Erfolgsmeldung anzeigen
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Einladung angenommen!
          </h1>
          <p className="text-gray-600 mb-2">
            Sie sind jetzt Mitglied der Organisation
          </p>
          <p className="text-lg font-semibold text-blue-600 mb-6">
            {invitation.organization.name}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Ihre Rolle: {invitation.role.name}
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium"
          >
            Zum Dashboard
          </a>
        </div>
      </div>
    );

  } catch (error) {
    console.error('Error accepting invitation:', error);
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Fehler</h1>
          <p className="text-gray-600 mb-6">
            Die Einladung konnte nicht angenommen werden.
          </p>
          <a
            href="/dashboard"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Zum Dashboard
          </a>
        </div>
      </div>
    );
  }
}