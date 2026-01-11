'use client';

import { useRouter } from 'next/navigation';

type Organization = {
  id: string;
  name: string;
  description: string;
  created_at: string;
};

type Props = {
  organization: Organization;
};

export default function OrganizationClient({ organization }: Props) {
  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-gray-200 px-4 py-2 transition-colors hover:bg-gray-300"
        >
          Zurück
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-700">
          {organization.description || 'Keine Beschreibung verfügbar'}
        </p>
        <p className="mt-4 text-sm text-gray-500">
          Erstellt am:{' '}
          {new Date(organization.created_at).toLocaleDateString('de-DE')}
        </p>
      </div>
    </div>
  );
}
