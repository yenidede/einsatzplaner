'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  createCalendarExportAction,
  createCalendarExportTemplateAction,
  deleteCalendarExportAction,
  deleteCalendarExportTemplateAction,
  getCalendarExportPreviewAction,
  listCalendarExportEligibilityAction,
  listCalendarExportsAction,
  listCalendarExportTemplatesAction,
  listCompatibleCalendarExportTemplatesAction,
  rotateSubscriptionAction,
  setCalendarExportActiveAction,
  updateCalendarExportAction,
  updateCalendarExportTemplateAction,
} from '../actions';
import type { CalendarExportConfig } from '../config';
import { calendarSubscriptionQueryKeys } from '../queryKeys';

export type CalendarExport = Awaited<
  ReturnType<typeof listCalendarExportsAction>
>[number];

export type CalendarExportTemplate = Awaited<
  ReturnType<typeof listCalendarExportTemplatesAction>
>[number];

export type CalendarExportEligibility = Awaited<
  ReturnType<typeof listCalendarExportEligibilityAction>
>[number];

export type CalendarExportMutationInput = {
  orgId: string;
  name: string;
  config: CalendarExportConfig;
};

export type CalendarExportTemplateMutationInput = {
  orgId: string;
  id?: string;
  name: string;
  description?: string | null;
  config: CalendarExportConfig;
};

export function useCalendarExports() {
  const queryClient = useQueryClient();
  const session = useSession();
  const userId = session.data?.user?.id;
  const queryKey = calendarSubscriptionQueryKeys.exports(userId);

  const query = useQuery({
    queryKey,
    queryFn: () => listCalendarExportsAction(),
    enabled: !!userId,
    staleTime: 60000,
  });

  const invalidateExports = () =>
    queryClient.invalidateQueries({
      queryKey: calendarSubscriptionQueryKeys.exports(userId),
    });

  const createExport = useMutation({
    mutationFn: ({ orgId, name, config }: CalendarExportMutationInput) =>
      createCalendarExportAction(orgId, { name, config }),
    onSuccess: async () => {
      await invalidateExports();
      toast.success('Kalenderexport wurde erstellt');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Kalenderexport konnte nicht erstellt werden'
      );
    },
  });

  const updateExport = useMutation({
    mutationFn: ({
      id,
      name,
      config,
    }: CalendarExportMutationInput & { id: string }) =>
      updateCalendarExportAction(id, { name, config }),
    onSuccess: async () => {
      await invalidateExports();
      toast.success('Kalenderexport wurde gespeichert');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Kalenderexport konnte nicht gespeichert werden'
      );
    },
  });

  const rotate = useMutation({
    mutationFn: (id: string) => rotateSubscriptionAction(id),
    onSuccess: async () => {
      await invalidateExports();
      toast.success('Neuer Kalender-Link wurde generiert');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Generieren des neuen Links'
      );
    },
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setCalendarExportActiveAction(id, isActive),
    onSuccess: async (_, variables) => {
      await invalidateExports();
      toast.success(
        variables.isActive
          ? 'Kalenderexport wurde aktiviert'
          : 'Kalenderexport wurde deaktiviert'
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Kalenderexport konnte nicht geändert werden'
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCalendarExportAction(id),
    onSuccess: async () => {
      await invalidateExports();
      toast.success('Kalenderexport wurde gelöscht');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Kalenderexport konnte nicht gelöscht werden'
      );
    },
  });

  return {
    query,
    createExport,
    updateExport,
    rotate,
    setActive,
    remove,
  };
}

export function useCalendarExportEligibility() {
  const session = useSession();
  return useQuery({
    queryKey: [
      ...calendarSubscriptionQueryKeys.all,
      'eligibility',
      session.data?.user?.id ?? '',
    ] as const,
    queryFn: () => listCalendarExportEligibilityAction(),
    enabled: !!session.data?.user?.id,
  });
}

export function useCalendarExportTemplates(orgId: string | null | undefined) {
  const queryClient = useQueryClient();
  const normalizedOrgId = orgId ?? undefined;
  const query = useQuery({
    queryKey: calendarSubscriptionQueryKeys.templates(normalizedOrgId),
    queryFn: () => listCalendarExportTemplatesAction(orgId ?? ''),
    enabled: !!orgId,
  });

  const invalidateTemplates = () =>
    queryClient.invalidateQueries({
      queryKey: calendarSubscriptionQueryKeys.templates(normalizedOrgId),
    });

  const createTemplate = useMutation({
    mutationFn: ({
      orgId: mutationOrgId,
      name,
      description,
      config,
    }: CalendarExportTemplateMutationInput) =>
      createCalendarExportTemplateAction(mutationOrgId, {
        name,
        description,
        config,
      }),
    onSuccess: async () => {
      await invalidateTemplates();
      toast.success('Kalenderexport-Vorlage wurde erstellt');
    },
    onError: () => {
      toast.error('Kalenderexport-Vorlage konnte nicht erstellt werden');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: ({
      orgId: mutationOrgId,
      id,
      name,
      description,
      config,
    }: CalendarExportTemplateMutationInput) => {
      if (!id) {
        throw new Error('Vorlage wurde nicht gefunden.');
      }
      return updateCalendarExportTemplateAction(mutationOrgId, id, {
        name,
        description,
        config,
      });
    },
    onSuccess: async () => {
      await invalidateTemplates();
      toast.success('Kalenderexport-Vorlage wurde gespeichert');
    },
    onError: () => {
      toast.error('Kalenderexport-Vorlage konnte nicht gespeichert werden');
    },
  });

  const removeTemplate = useMutation({
    mutationFn: ({ orgId: mutationOrgId, id }: { orgId: string; id: string }) =>
      deleteCalendarExportTemplateAction(mutationOrgId, id),
    onSuccess: async () => {
      await invalidateTemplates();
      toast.success('Kalenderexport-Vorlage wurde gelöscht');
    },
    onError: () => {
      toast.error('Kalenderexport-Vorlage konnte nicht gelöscht werden');
    },
  });

  return {
    query,
    createTemplate,
    updateTemplate,
    removeTemplate,
  };
}

export function useCompatibleCalendarExportTemplates(
  orgId: string | null | undefined
) {
  const normalizedOrgId = orgId ?? undefined;
  return useQuery({
    queryKey: [
      ...calendarSubscriptionQueryKeys.templates(normalizedOrgId),
      'compatible',
    ] as const,
    queryFn: () => listCompatibleCalendarExportTemplatesAction(orgId ?? ''),
    enabled: !!orgId,
  });
}

export function useCalendarExportPreview(
  orgId: string | null | undefined,
  config: CalendarExportConfig | null | undefined
) {
  const session = useSession();
  const normalizedOrgId = orgId ?? undefined;
  return useQuery({
    queryKey: [
      ...calendarSubscriptionQueryKeys.preview(
        session.data?.user?.id,
        normalizedOrgId
      ),
      config,
    ] as const,
    queryFn: () => getCalendarExportPreviewAction(orgId ?? '', config),
    enabled: !!orgId && !!config && !!session.data?.user?.id,
    staleTime: 15000,
  });
}
