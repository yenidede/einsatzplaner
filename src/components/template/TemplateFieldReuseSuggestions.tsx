'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TemplateFieldReuseCandidate } from '@/features/template/template-dal';
import { TemplateFieldReuseCandidateCard } from './TemplateFieldReuseCandidateCard';

interface TemplateFieldReuseSuggestionsProps {
  fieldName: string;
  candidates: TemplateFieldReuseCandidate[];
  isConnecting: boolean;
  isCreating: boolean;
  onBack: () => void;
  onCreateNew: () => void;
  onConnect: (fieldId: string) => void;
}

export function TemplateFieldReuseSuggestions({
  fieldName,
  candidates,
  isConnecting,
  isCreating,
  onBack,
  onCreateNew,
  onConnect,
}: TemplateFieldReuseSuggestionsProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4" />
          Ähnliche bestehende Felder gefunden
        </div>
        <p className="text-muted-foreground text-sm">
          Für &quot;{fieldName}&quot; gibt es bereits ähnliche Felder in anderen
          Vorlagen. Wenn du eines davon verbindest, bleiben Änderungen daran
          künftig automatisch synchron.
        </p>
      </div>

      <div className="space-y-3">
        {candidates.map((candidate) => (
          <TemplateFieldReuseCandidateCard
            key={candidate.fieldId}
            candidate={candidate}
            connectLabel="Dieses Feld verbinden"
            connectDisabled={isConnecting || isCreating}
            onConnect={onConnect}
          >
            {candidate.allowedValues.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium tracking-wide text-slate-600 uppercase">
                  Optionen
                </p>
                <div className="flex flex-wrap gap-2">
                  {candidate.allowedValues.map((value) => (
                    <Badge
                      key={`${candidate.fieldId}-${value}`}
                      variant="secondary"
                    >
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TemplateFieldReuseCandidateCard>
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onBack}
          disabled={isConnecting || isCreating}
        >
          Zurück
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCreateNew}
          disabled={isConnecting || isCreating}
        >
          {isCreating ? 'Erstellt…' : 'Neues Feld trotzdem erstellen'}
        </Button>
      </div>
    </div>
  );
}
