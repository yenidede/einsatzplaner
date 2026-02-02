'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { queryKeys as templateQueryKeys } from '@/features/einsatztemplate/queryKeys';
import type { PropertyConfig } from '@/features/user_properties/types';
import {
  createTemplateAction,
  updateTemplateAction,
  createTemplateFieldAction,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from '../template-dal';

export function useTemplateMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (input: CreateTemplateInput) => createTemplateAction(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      void queryClient.refetchQueries({ queryKey: templateQueryKeys.all });
      toast.success('Vorlage erstellt');
      router.push(`/settings/vorlage/${data.id}`);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Erstellen der Vorlage'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      templateId,
      ...input
    }: { templateId: string } & UpdateTemplateInput) =>
      updateTemplateAction(templateId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      void queryClient.refetchQueries({ queryKey: templateQueryKeys.all });
      toast.success('Vorlage gespeichert');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
    },
  });

  const addTemplateFieldMutation = useMutation({
    mutationFn: ({
      templateId,
      config,
    }: {
      templateId: string;
      config: PropertyConfig;
    }) => createTemplateFieldAction(templateId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      void queryClient.refetchQueries({ queryKey: templateQueryKeys.all });
      toast.success('Feld hinzugefügt');
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Hinzufügen des Feldes'
      );
    },
  });

  return {
    createMutation,
    updateMutation,
    addTemplateFieldMutation,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}
