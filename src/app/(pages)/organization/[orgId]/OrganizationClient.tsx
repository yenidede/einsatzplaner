"use client";

import { useRouter } from "next/navigation";

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
        >
          Zurück
        </button>
      </div>

      <div className="bg-white rounded-lg p-6 shadow">
        <p className="text-gray-700">
          {organization.description || "Keine Beschreibung verfügbar"}
        </p>
        <p className="text-sm text-gray-500 mt-4">
          Erstellt am: {new Date(organization.created_at).toLocaleDateString("de-DE")}
        </p>
      </div>
    </div>
  );
}