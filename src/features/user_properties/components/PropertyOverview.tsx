'use client';

import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/SimpleFormComponents';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { UserPropertyWithField } from '../user_property-dal';

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
    <div className="flex flex-col items-start justify-start gap-2 self-stretch">
      <div className="inline-flex items-center justify-start gap-2.5 self-stretch px-4 pt-2">
        <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
          Personeneigenschaften
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
        {isLoading && (
          <div className="self-stretch px-4 text-center text-slate-600">
            Lade Eigenschaften...
          </div>
        )}

        {/* Bild nur anzeigen wenn keine Eigenschaften vorhanden sind */}
        {!isLoading && !hasProperties && (
          <div className="flex flex-col items-start justify-start gap-4 self-stretch px-4">
            <div className="inline-flex items-center justify-center gap-2.5 self-stretch">
              <div className="flex-1 justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-600">
                Erstelle ein neues Eigenschaftsfeld, um Personen deiner
                Organisation Eigenschaften zuzuweisen. Beispielsweise kannst du
                festlegen, dass jeder Einsatz mindestens eine Person mit
                Schlüssel erfordert.
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2.5 self-stretch px-4">
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
          <div className="flex flex-col gap-2 self-stretch px-4">
            <div className="text-sm font-medium text-slate-900">
              Vorhandene Eigenschaften ({properties.length})
            </div>
            {properties.map((property) => (
              <div
                key={property.id}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {property.field.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {property.field.type?.name}
                    {property.field.is_required && ' • Pflichtfeld'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onEdit?.(property.id)}
                        className="rounded-md p-2 transition-colors hover:bg-slate-100"
                      >
                        <Pencil className="h-4 w-4 text-slate-600" />
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
                        className="rounded-md p-2 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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
              <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
                <div
                  onClick={onCreateNew}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-50 px-4 py-5 outline outline-1 outline-offset-[-1px] outline-slate-200 transition-colors hover:bg-slate-100"
                >
                  <PlusIcon className="relative h-4 w-4 overflow-hidden" />
                  <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-900">
                    Neue Eigenschaft Anlegen
                  </div>
                </div>
              </div>
            )}

            <div className="inline-flex items-start justify-end gap-2 self-stretch px-4 pt-2">
              <Button
                onClick={onCancel}
                className="flex items-center justify-center gap-2.5 rounded-md bg-white px-4 py-2 outline outline-1 outline-offset-[-1px] outline-slate-200"
              >
                <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-900">
                  Abbrechen
                </div>
              </Button>
              <Button
                onClick={onCreateNew}
                className="flex items-center justify-center gap-2.5 rounded-md bg-slate-900 px-4 py-2"
              >
                <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-white">
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
