"use client";

import { getUserOrganizationByIdAction } from "@/features/settings/organization-action";
import { useQuery } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type PageProps = {
  params: Promise<{ orgId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function OrganizationPage({ params }: PageProps) {
  const { orgId } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrganizationPageClient orgId={orgId} />
    </Suspense>
  );
}

function OrganizationPageClient({ orgId }: { orgId: string }) {
  const { data, error } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => getUserOrganizationByIdAction(orgId),
  });

  if (error) {
    notFound();
  }
  if (!data) {
    return <div>Organisation nicht gefunden</div>;
  }
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{data.name}</h1>
      <p className="text-gray-700 mt-4">{data.description}</p>
    </div>
  );
}
