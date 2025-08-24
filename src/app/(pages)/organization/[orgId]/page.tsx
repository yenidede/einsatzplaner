"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

export default function OrganizationPage() {
    const params = useParams();
    const router = useRouter();
    const organizationId = params.id as string;

    const { data: organization, isLoading, error } = useQuery({
        queryKey: ["organization", organizationId],
        enabled: !!organizationId,
        queryFn: async () => {
            const res = await fetch(`/api/auth/organization?id=${organizationId}`);
            if (!res.ok) throw new Error("Fehler beim Laden der Organisation");
            return res.json();
        },
    });

    if (isLoading) return <div>Lade Organisation...</div>;
    if (error) return <div>Fehler beim Laden der Organisation</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">{organization?.name}</h1>
                <button 
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-gray-200 rounded-md"
                >
                    Zurück
                </button>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow">
                <p>{organization?.description || "Keine Beschreibung verfügbar"}</p>
            </div>
        </div>
    );
}