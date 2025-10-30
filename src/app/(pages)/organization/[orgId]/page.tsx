/* "use client"; */

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { getOrganizationAction } from "@/features/organization/organization.server";
import { notFound } from "next/navigation";

type Props = {
  params: {
    orgId: string;
  };
};

export default async function OrganizationPage({ params }: Props) {
  try {
    const organization = await getOrganizationAction(params.orgId);

    // Direkt in der Server Component rendern
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">{organization.name}</h1>
        <p className="text-gray-700 mt-4">{organization.description}</p>
      </div>
    );
  } catch (error) {
    notFound();
  }
}