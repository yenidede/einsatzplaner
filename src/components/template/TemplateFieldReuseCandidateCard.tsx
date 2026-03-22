'use client';

import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { TemplateFieldReuseCandidate } from '@/features/template/template-dal';

interface TemplateFieldReuseCandidateCardProps {
  candidate: TemplateFieldReuseCandidate;
  connectLabel: string;
  connectDisabled: boolean;
  onConnect: (fieldId: string) => void;
  children?: React.ReactNode;
}

export function TemplateFieldReuseCandidateCard({
  candidate,
  connectLabel,
  connectDisabled,
  onConnect,
  children,
}: TemplateFieldReuseCandidateCardProps) {
  return (
    <Card className="gap-3 py-3">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base leading-none">
                {candidate.name}
                {candidate.isRequired && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </CardTitle>
              <Badge variant="outline">
                {candidate.typeName?.trim() ||
                  candidate.datatype ||
                  'Unbekannt'}
              </Badge>
            </div>
            <CardDescription>
              {candidate.description?.trim() || 'Keine Beschreibung hinterlegt.'}
            </CardDescription>
          </div>
          {candidate.linkedTemplateNames.length > 0 && (
            <div className="flex grow flex-wrap justify-end gap-2">
              {candidate.linkedTemplateNames.map((templateName) => (
                <Badge
                  key={`${candidate.fieldId}-${templateName}`}
                  variant="outline"
                >
                  {templateName}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        {children}
        <div className="flex justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => onConnect(candidate.fieldId)}
            disabled={connectDisabled}
          >
            <Link2 className="mr-2 h-4 w-4" />
            {connectLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
