"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { getOrganizationDetailsAction } from "../../organization-action";
import { settingsQueryKeys } from "../../queryKeys/queryKey";

interface OrganizationDetailsProps {
  organizationId: string;
  website: string;
  vat: string;
  zvr: string;
  authority: string;
  onWebsiteChange: (value: string) => void;
  onVatChange: (value: string) => void;
  onZvrChange: (value: string) => void;
  onAuthorityChange: (value: string) => void;
}

export function OrganizationDetails({
  organizationId,
  website,
  vat,
  zvr,
  authority,
  onWebsiteChange,
  onVatChange,
  onZvrChange,
  onAuthorityChange,
}: OrganizationDetailsProps) {
  const { data: details, isLoading } = useQuery({
    queryKey: settingsQueryKeys.orgDetails(organizationId),
    queryFn: () => getOrganizationDetailsAction(organizationId),
    enabled: !!organizationId,
  });

  // Formular mit geladenen Daten befüllen
  useEffect(() => {
    if (details) {
      onWebsiteChange(details.website || "");
      onVatChange(details.vat || "");
      onZvrChange(details.zvr || "");
      onAuthorityChange(details.authority || "");
    }
  }, [details, onWebsiteChange, onVatChange, onZvrChange, onAuthorityChange]);

  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-700" />
          <div className="text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Weitere Details
          </div>
        </div>
      </div>

      <div className="self-stretch px-4 py-2 flex flex-col gap-3">
        {isLoading ? (
          <div className="text-sm text-slate-500">Lädt Details...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => onWebsiteChange(e.target.value)}
                placeholder="https://www.beispiel.at"
                className="px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                UID / Steuernummer
              </label>
              <input
                type="text"
                value={vat}
                onChange={(e) => onVatChange(e.target.value)}
                placeholder="ATU12345678"
                className="px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Zentrales Vereinsregister
              </label>
              <input
                type="text"
                value={zvr}
                onChange={(e) => onZvrChange(e.target.value)}
                placeholder="123456789"
                className="px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Zuständige Behörde
              </label>
              <input
                type="text"
                value={authority}
                onChange={(e) => onAuthorityChange(e.target.value)}
                placeholder="Magistrat der Stadt Wien"
                className="px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
