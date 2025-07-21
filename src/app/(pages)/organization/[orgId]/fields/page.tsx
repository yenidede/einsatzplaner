"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function OrganizationFieldsPage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/auth/organization/${orgId}/fields`)
      .then((res) => res.json())
      .then((data) => setFields(data))
      .finally(() => setLoading(false));
  }, [orgId]);

  // Hier kannst du das Design/JSX anpassen:
  return (
    <div>
      <h1>Felder der Organisation</h1>
      {loading ? (
        <p>Lade Felder...</p>
      ) : (
        <ul>
          {fields.map((field) => (
            <li key={field.id}>{field.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
