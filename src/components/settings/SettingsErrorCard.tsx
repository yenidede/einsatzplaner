'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface SettingsErrorCardProps {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  hideHomeAction?: boolean;
}

export function SettingsErrorCard({
  title = 'Fehler',
  description,
  error,
  onRetry,
  primaryActionLabel,
  onPrimaryAction,
  hideHomeAction = false,
}: SettingsErrorCardProps) {
  const router = useRouter();

  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description ||
              (error ? 'Fehler beim Laden der Daten' : 'Daten nicht gefunden')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {primaryActionLabel && onPrimaryAction ? (
            <Button onClick={onPrimaryAction} variant="default">
              {primaryActionLabel}
            </Button>
          ) : null}
          {onRetry && (
            <Button onClick={onRetry} variant="default">
              Erneut versuchen
            </Button>
          )}
          {!hideHomeAction ? (
            <Button onClick={() => router.push('/')} variant="outline">
              Zur Startseite
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
