'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { analyticsQueryKeys } from '@/features/analytics/queryKeys';
import { useAnalyticsCharts } from '@/features/analytics/hooks/use-analytics-queries';
import {
  createAnalyticsChartAction,
  deleteAnalyticsChartAction,
  updateAnalyticsChartAction,
} from '@/features/analytics/analytics-actions';
import { getAnalyticsDimensionDescriptors } from '@/features/analytics/analytics-utils';
import type {
  AnalyticsChartInput,
  AnalyticsChartRecord,
} from '@/features/analytics/types';
import { useEinsaetzeTableView } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { AnalyticsChartCard } from './AnalyticsChartCard';
import { AnalyticsChartDialog } from './AnalyticsChartDialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AnalyticsPage() {
  const queryClient = useQueryClient();
  const { showDestructive } = useConfirmDialog();
  const { data: session } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<AnalyticsChartRecord | null>(
    null
  );

  const activeOrgId = session?.user.activeOrganization?.id;
  const einsatzOrgIds = activeOrgId ? [activeOrgId] : [];
  const { data: organizations } = useOrganizations(einsatzOrgIds);
  const { einsatz_plural, einsatz_singular, helper_plural } =
    useOrganizationTerminology(organizations, activeOrgId);

  const { data: charts = [], isLoading: chartsLoading } =
    useAnalyticsCharts(activeOrgId);
  const { data: einsaetze = [], isLoading: einsaetzeLoading } =
    useEinsaetzeTableView(einsatzOrgIds);

  const availableFields = useMemo(() => {
    return getAnalyticsDimensionDescriptors(einsaetze, {
      einsatzSingular: einsatz_singular,
      helperPlural: helper_plural,
    });
  }, [einsaetze, einsatz_singular, helper_plural]);

  const createOrUpdateMutation = useMutation({
    mutationFn: async ({
      chartId,
      input,
    }: {
      chartId: string | null;
      input: AnalyticsChartInput;
    }) => {
      if (!activeOrgId) {
        throw new Error('Keine aktive Organisation ausgewählt.');
      }

      if (chartId) {
        return updateAnalyticsChartAction(chartId, input);
      }

      return createAnalyticsChartAction(activeOrgId, input);
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.chartId
          ? 'Diagramm erfolgreich aktualisiert.'
          : 'Diagramm erfolgreich erstellt.'
      );
      if (activeOrgId) {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.byOrg(activeOrgId),
        });
      }
      setIsDialogOpen(false);
      setEditingChart(null);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Diagramm konnte nicht gespeichert werden.'
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chartId: string) => deleteAnalyticsChartAction(chartId),
    onSuccess: () => {
      toast.success('Diagramm erfolgreich gelöscht.');
      if (activeOrgId) {
        queryClient.invalidateQueries({
          queryKey: analyticsQueryKeys.byOrg(activeOrgId),
        });
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Diagramm konnte nicht gelöscht werden.'
      );
    },
  });

  const handleCreate = () => {
    setEditingChart(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (chart: AnalyticsChartRecord) => {
    setEditingChart(chart);
    setIsDialogOpen(true);
  };

  const handleDelete = async (chart: AnalyticsChartRecord) => {
    const result = await showDestructive(
      'Diagramm löschen',
      `Möchten Sie das Diagramm "${chart.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );

    if (result === 'success') {
      deleteMutation.mutate(chart.id);
    }
  };

  const isLoading = chartsLoading || einsaetzeLoading;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">Auswertungen</h1>
            <p className="text-muted-foreground text-sm">
              Organisationsweite Diagramme für Ihre {einsatz_plural}.
            </p>
          </div>
          <Button onClick={handleCreate} className="sm:shrink-0">
            Diagramm erstellen
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 rounded-xl border p-6"
              >
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-72 w-full" />
              </div>
            ))}
          </div>
        ) : charts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 />
              </EmptyMedia>
              <EmptyTitle>Keine Auswertungen vorhanden</EmptyTitle>
              <EmptyDescription>
                Erstellen Sie Ihr erstes Diagramm, um organisationsweite{' '}
                {einsatz_plural} auszuwerten.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {charts.map((chart) => (
              <AnalyticsChartCard
                key={chart.id}
                chart={chart}
                rows={einsaetze}
                terminology={{
                  einsatzSingular: einsatz_singular,
                  helperPlural: helper_plural,
                }}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Diagramm erstellen</CardTitle>
                <CardDescription>
                  Fügen Sie eine weitere Auswertung für Ihre {einsatz_plural}{' '}
                  hinzu.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onClick={handleCreate}
                  className="group bg-muted/30 hover:bg-muted/50 flex h-72 w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-dashed text-left transition-colors"
                >
                  <div className="flex flex-1 items-end gap-4 px-6 pt-8">
                    <div className="bg-primary/25 group-hover:bg-primary/30 h-20 flex-1 rounded-t-md transition-colors" />
                    <div className="bg-primary/40 group-hover:bg-primary/45 h-36 flex-1 rounded-t-md transition-colors" />
                    <div className="bg-primary/20 group-hover:bg-primary/25 h-12 flex-1 rounded-t-md transition-colors" />
                    <div className="bg-primary/55 group-hover:bg-primary/60 h-28 flex-1 rounded-t-md transition-colors" />
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
                    <span className="text-sm font-medium">
                      Neues Diagramm anlegen
                    </span>
                    <Button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCreate();
                      }}
                    >
                      Diagramm erstellen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AnalyticsChartDialog
        chart={editingChart}
        fields={availableFields}
        einsatzSingular={einsatz_singular}
        einsatzPlural={einsatz_plural}
        isOpen={isDialogOpen}
        isPending={createOrUpdateMutation.isPending}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingChart(null);
          }
        }}
        onSave={async (chartId, input) =>
          void (await createOrUpdateMutation.mutateAsync({ chartId, input }))
        }
      />
    </>
  );
}
