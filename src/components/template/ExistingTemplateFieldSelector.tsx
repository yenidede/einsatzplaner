'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TemplateFieldReuseCandidate } from '@/features/template/template-dal';
import { TemplateFieldReuseCandidateCard } from './TemplateFieldReuseCandidateCard';
import {
  getTemplateFieldSearchParts,
  normalizeTemplateFieldSearchValue,
} from './template-field-reuse-utils';

interface ExistingTemplateFieldSelectorProps {
  candidates: TemplateFieldReuseCandidate[];
  isLoading: boolean;
  isError: boolean;
  isConnecting: boolean;
  onBack: () => void;
  onConnect: (fieldId: string) => void;
  onRetry: () => void;
}

export function ExistingTemplateFieldSelector({
  candidates,
  isLoading,
  isError,
  isConnecting,
  onBack,
  onConnect,
  onRetry,
}: ExistingTemplateFieldSelectorProps) {
  const [searchValue, setSearchValue] = useState('');
  const normalizedSearchValue =
    normalizeTemplateFieldSearchValue(searchValue);

  const filteredCandidates = useMemo(() => {
    if (!normalizedSearchValue) {
      return candidates;
    }

    return candidates.filter((candidate) => {
      return getTemplateFieldSearchParts(candidate).some((part) =>
        normalizeTemplateFieldSearchValue(part).includes(normalizedSearchValue)
      );
    });
  }, [candidates, normalizedSearchValue]);

  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-900">
          Bestehendes Feld verknüpfen
        </div>
        <p className="text-muted-foreground text-sm">
          Wähle ein bestehendes Feld aus einer anderen Vorlage aus, damit alle
          Vorlagen künftig dieselbe Felddefinition teilen.
        </p>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Nach Feldname oder Vorlage suchen"
          className="pl-9"
        />
      </div>

      <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
            Bestehende Felder werden geladen…
          </div>
        ) : isError ? (
          <div className="space-y-3 rounded-md border border-dashed px-4 py-8 text-center text-sm">
            <p className="text-destructive">
              Bestehende Felder konnten nicht geladen werden.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              disabled={isConnecting}
            >
              Erneut versuchen
            </Button>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-muted-foreground rounded-md border border-dashed px-4 py-8 text-center text-sm">
            Keine bestehenden Felder gefunden.
          </div>
        ) : (
          filteredCandidates.map((candidate) => (
            <TemplateFieldReuseCandidateCard
              key={candidate.fieldId}
              candidate={candidate}
              connectLabel="Feld verknüpfen"
              connectDisabled={isConnecting}
              onConnect={onConnect}
            />
          ))
        )}
      </div>

      <div className="flex justify-end border-t border-slate-200 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={isConnecting || isLoading}
        >
          Zurück
        </Button>
      </div>
    </div>
  );
}
