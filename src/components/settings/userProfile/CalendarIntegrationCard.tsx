'use client';

import {
  Calendar,
  Copy,
  ExternalLink,
  RefreshCw,
  Link2Off,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCalendarSubscription } from '@/features/calendar-subscription/hooks/useCalendarSubscription';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface CalendarIntegrationCardProps {
  org: { id: string; name: string };
}

export function CalendarIntegrationCard({ org }: CalendarIntegrationCardProps) {
  const { query, rotate, deactivate, activate } = useCalendarSubscription(
    org.id
  );
  const subscription = query.data;

  const copyUrl = async () => {
    if (subscription?.webcalUrl) {
      try {
        await navigator.clipboard.writeText(subscription.webcalUrl);
        toast.success('URL in Zwischenablage kopiert');
      } catch (error) {
        toast.error(
          'Fehler beim Kopieren der URL: ' +
            (error instanceof Error ? error.message : String(error))
        );
      }
    }
  };

  if (query.isLoading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="border-destructive/50 bg-destructive/5 rounded-lg border p-4">
        <div className="text-destructive flex items-center gap-3">
          <Calendar className="h-5 w-5" />
          <div>
            <p className="font-medium">{org.name}</p>
            <p className="text-sm">
              Fehler beim Laden der Kalender-Integration
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <div className="text-muted-foreground flex items-center gap-3">
          <Calendar className="h-5 w-5" />
          <div>
            <p className="font-medium">{org.name}</p>
            <p className="text-sm">Keine Kalender-Integration verfügbar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <Calendar className="text-primary h-5 w-5" />
          </div>
          <div>
            <h4 className="font-medium">{org.name}</h4>
            <p className="text-muted-foreground text-sm">
              {subscription.is_active ? 'Aktiv' : 'Deaktiviert'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {subscription.is_active ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Aktiv
            </span>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                activate.mutate(subscription.id);
              }}
              disabled={activate.isPending}
            >
              {activate.isPending ? 'Aktiviere...' : 'Aktivieren'}
            </Button>
          )}
        </div>
      </div>

      <button
        type="button"
        className={cn(
          'group w-full rounded-md p-3 text-left transition-colors',
          subscription.is_active
            ? 'bg-muted/50 hover:bg-muted cursor-pointer'
            : 'bg-muted/30 cursor-default opacity-60'
        )}
        onClick={subscription.is_active ? copyUrl : undefined}
        title={subscription.is_active ? 'Klicken zum Kopieren' : undefined}
        disabled={!subscription.is_active}
      >
        <span className="text-muted-foreground font-mono text-xs break-all">
          {subscription.webcalUrl}
        </span>
      </button>

      {subscription.is_active ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyUrl}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            URL kopieren
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={subscription.webcalUrl}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              In Kalender öffnen
            </a>
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  rotate.mutate(subscription.id);
                }}
                disabled={rotate.isPending}
              >
                <RefreshCw
                  className={cn(
                    'mr-2 h-3.5 w-3.5',
                    rotate.isPending && 'animate-spin'
                  )}
                />
                {rotate.isPending ? 'Generiere...' : 'Neu generieren'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Der alte Link wird widerrufen und ein neuer generiert.
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  deactivate.mutate(subscription.id);
                }}
                disabled={deactivate.isPending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Link2Off className="mr-2 h-3.5 w-3.5" />
                {deactivate.isPending ? 'Deaktiviere...' : 'Deaktivieren'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Synchronisation temporär deaktivieren, kann wieder aktiviert
                werden.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Die Kalender-Integration ist deaktiviert. Aktivieren Sie sie, um die
          Synchronisation wieder zu starten.
        </p>
      )}
    </div>
  );
}
