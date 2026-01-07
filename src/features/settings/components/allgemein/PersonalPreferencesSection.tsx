"use client";

import { Switch } from "@/features/settings/components/ui/switch";
import { Label } from "@/features/settings/components/ui/label";
import { LabelSettings } from "@/features/settings/components/ui/LabelSettings";
import { Salutation } from "../../types";

interface PersonalPreferencesSectionProps {
  showLogos: boolean;
  salutationId: string;
  salutations: Salutation[];
  onShowLogosChange: (value: boolean) => void;
  onSalutationChange: (value: string) => void;
}

export function PersonalPreferencesSection({
  showLogos,
  salutationId,
  salutations,
  onShowLogosChange,
  onSalutationChange,
}: PersonalPreferencesSectionProps) {
  return (
    <div className="self-stretch flex flex-col justify-center items-start">
      <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
        <div className="flex-1 flex justify-start items-center gap-2">
          <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
            Persönliche Präferenzen
          </div>
        </div>
      </div>

      <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
        <div className="flex-1 px-4 flex justify-start items-start gap-4">
          <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
              Zeige Logos in Kalenderansicht
            </div>
            <div className="inline-flex items-center gap-2">
              <Switch
                id="logo-switch"
                checked={showLogos}
                onCheckedChange={onShowLogosChange}
                aria-label="Toggle switch"
              />
              <Label htmlFor="logo-switch" className="text-sm font-medium">
                {showLogos ? "On" : "Off"}
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
        <div className="flex-1 px-4 flex justify-start items-start gap-4">
          <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
            <LabelSettings htmlFor="salutation" className="text-sm font-medium">
              Anrede
            </LabelSettings>
            <select
              id="salutation"
              value={salutationId || ""}
              onChange={(e) => onSalutationChange(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 w-full"
            >
              <option value="">Bitte wählen</option>
              {salutations.map((sal) => (
                <option key={sal.id} value={sal.id}>
                  {sal.salutation}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
