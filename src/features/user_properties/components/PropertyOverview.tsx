'use client';

import { PlusIcon, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
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
      <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
        {isLoading && (
          <div className="self-stretch text-center text-slate-600">
            Lade Eigenschaften...
          </div>
        )}

        {/* Bild nur anzeigen wenn keine Eigenschaften vorhanden sind */}
        {!isLoading && !hasProperties && (
          <div className="flex flex-col items-start justify-start gap-4 self-stretch">
            <div className="inline-flex items-center justify-center gap-2.5 self-stretch">
              <div className="flex-1 justify-start font-['Inter'] text-sm leading-tight font-medium text-slate-600">
                Erstellen Sie ein neues Eigenschaftsfeld, um Personen Ihrer
                Organisation Eigenschaften zuzuweisen. Beispielsweise können Sie
                festlegen, dass jeder Einsatz mindestens eine Person mit
                Schlüssel erfordert.
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-2.5 self-stretch">
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
          <div className="flex flex-col gap-2 self-stretch">
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
                      <Button
                        onClick={() => onEdit?.(property.id)}
                        variant="ghost"
                        size="icon"
                      >
                        <Pencil />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Eigenschaft bearbeiten</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => onDelete?.(property.id)}
                        variant="destructive"
                        size="icon"
                      >
                        <Trash2 />
                      </Button>
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
              <Button onClick={onCreateNew}>
                <PlusIcon size={16} />
                Neue Eigenschaft anlegen
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
