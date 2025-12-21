"use client";

import { PlusIcon, Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/SimpleFormComponents";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserPropertyWithField } from "../user_property-dal";

interface PropertyOverviewProps {
  onCreateNew: () => void;
  onCancel: () => void;
  properties: UserPropertyWithField[] | undefined;
  isLoading: boolean;
  onEdit?: (propertyId: string) => void;
  onDelete?: (propertyId: string) => void;
  showCreateForm?: boolean;
  hideActions?: boolean;
}

export function PropertyOverview({
  onCreateNew,
  onCancel,
  properties,
  isLoading,
  onEdit,
  onDelete,
  showCreateForm = false,
  hideActions = false,
}: PropertyOverviewProps) {
  const hasProperties = properties && properties.length > 0;

  return (
    <div className="self-stretch flex flex-col justify-start items-start gap-2">
      <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
        <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
          Personeneigenschaften
        </div>
      </div>

      <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
        {isLoading && (
          <div className="self-stretch px-4 text-center text-slate-600">
            Lade Eigenschaften...
          </div>
        )}

        {/* Bild nur anzeigen wenn keine Eigenschaften vorhanden sind */}
        {!isLoading && !hasProperties && (
          <div className="self-stretch px-4 flex flex-col justify-start items-start gap-4">
            <div className="self-stretch inline-flex justify-center items-center gap-2.5">
              <div className="flex-1 justify-start text-slate-600 text-sm font-medium font-['Inter'] leading-tight">
                Erstelle ein neues Eigenschaftsfeld, um Personen deiner
                Organisation Eigenschaften zuzuweisen. Beispielsweise kannst du
                festlegen, dass jeder Einsatz mindestens eine Person mit
                Schlüssel erfordert.
              </div>
            </div>
            <div className="self-stretch px-4 flex flex-col justify-center items-center gap-2.5">
              <Image
                src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/undraw_instant-analysis_vm8x%201.svg"
                alt="Illustration für Personeneigenschaften"
                width={245}
                height={210}
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Property Liste immer anzeigen wenn vorhanden */}
        {!isLoading && hasProperties && (
          <div className="self-stretch px-4 flex flex-col gap-2">
            <div className="text-slate-900 text-sm font-medium">
              Vorhandene Eigenschaften ({properties.length})
            </div>
            {properties.map((property) => (
              <div
                key={property.id}
                className="p-3 bg-white rounded-md border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {property.field.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {property.field.type?.name}
                    {property.field.is_required && " • Pflichtfeld"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onEdit?.(property.id)}
                        className="p-2 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-slate-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eigenschaft bearbeiten</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onDelete?.(property.id)}
                        className="p-2 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eigenschaft löschen</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions nur anzeigen wenn nicht versteckt */}
        {!hideActions && (
          <>
            {!showCreateForm && (
              <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                <div
                  onClick={onCreateNew}
                  className="flex-1 px-4 py-5 bg-slate-50 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <PlusIcon className="w-4 h-4 relative overflow-hidden" />
                  <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                    Neue Eigenschaft Anlegen
                  </div>
                </div>
              </div>
            )}

            <div className="self-stretch px-4 pt-2 inline-flex justify-end items-start gap-2">
              <Button
                onClick={onCancel}
                className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
              >
                <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                  Abbrechen
                </div>
              </Button>
              <Button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-900 rounded-md flex justify-center items-center gap-2.5"
              >
                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
                  Speichern
                </div>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
