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
  updateTemplateFieldAction,
  deleteTemplateAction,
  deleteTemplateFieldAction,
  setTemplateDefaultCategoriesAction,
  setTemplateRequiredUserPropertiesAction,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type TemplateRequiredUserPropertyInput,
} from '../template-dal';

export function useTemplateMutations() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const createMutation = useMutation({
    mutationFn: (input: CreateTemplateInput) => createTemplateAction(input),
    onMutate: () => ({
      toastId: toast.loading('Vorlage wird erstellt…'),
    }),
    onSuccess: (data, _variables, context) => {
      queryClient.setQueryData(templateQueryKeys.template(data.id), {
        ...data,
        template_icon: null,
        template_field: [],
      });
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Vorlage erstellt', { id: context?.toastId });
      router.replace(`/settings/vorlage/${data.id}`);
    },
    onError: (err, _variables, context) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Erstellen der Vorlage',
        { id: context?.toastId }
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      templateId,
      ...input
    }: { templateId: string } & UpdateTemplateInput) =>
      updateTemplateAction(templateId, input),
    onMutate: () => ({
      toastId: toast.loading('Vorlage wird gespeichert…'),
    }),
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Vorlage gespeichert', { id: context?.toastId });
    },
    onError: (err, _variables, context) => {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern', {
        id: context?.toastId,
      });
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
    onMutate: () => ({
      toastId: toast.loading('Feld wird hinzugefügt…'),
    }),
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Feld hinzugefügt', { id: context?.toastId });
    },
    onError: (err, _variables, context) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Hinzufügen des Feldes',
        { id: context?.toastId }
      );
    },
  });

  const updateTemplateFieldMutation = useMutation({
    mutationFn: ({
      templateId,
      fieldId,
      config,
    }: {
      templateId: string;
      fieldId: string;
      config: PropertyConfig;
    }) => updateTemplateFieldAction(templateId, fieldId, config),
    onMutate: () => ({
      toastId: toast.loading('Feld wird gespeichert…'),
    }),
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Feld gespeichert', { id: context?.toastId });
    },
    onError: (err, _variables, context) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Speichern des Feldes',
        { id: context?.toastId }
      );
    },
  });

  const deleteTemplateFieldMutation = useMutation({
    mutationFn: ({
      templateId,
      fieldId,
    }: {
      templateId: string;
      fieldId: string;
    }) => deleteTemplateFieldAction(templateId, fieldId),
    onMutate: () => ({
      toastId: toast.loading('Feld wird von der Vorlage entfernt…'),
    }),
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Feld von der Vorlage entfernt', { id: context?.toastId });
    },
    onError: (err, _variables, context) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Entfernen des Feldes',
        { id: context?.toastId }
      );
    },
  });

  const setDefaultCategoriesMutation = useMutation({
    mutationFn: ({
      templateId,
      categoryIds,
    }: {
      templateId: string;
      categoryIds: string[];
    }) => setTemplateDefaultCategoriesAction(templateId, categoryIds),
    onMutate: () => ({
      toastId: toast.loading('Standard-Kategorien werden gespeichert…'),
    }),
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Standard-Kategorien gespeichert', { id: context?.toastId });
    },
    onError: (err, _variables, context) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Speichern',
        { id: context?.toastId }
      );
    },
  });

  const setTemplateRequiredUserPropertiesMutation = useMutation({
    mutationFn: ({
      templateId,
      configs,
    }: {
      templateId: string;
      configs: TemplateRequiredUserPropertyInput[];
    }) => setTemplateRequiredUserPropertiesAction(templateId, configs),
    onMutate: () => ({
      toastId: toast.loading(
        'Benötigte Personeneigenschaften werden gespeichert…'
      ),
    }),
    onSuccess: (_data, _variables, context) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Personeneigenschaften gespeichert', {
        id: context?.toastId,
      });
    },
    onError: (err, _variables, context) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Speichern',
        { id: context?.toastId }
      );
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: ({
      templateId,
    }: {
      templateId: string;
      redirectTo: string;
    }) => deleteTemplateAction(templateId),
    onMutate: () => ({
      toastId: toast.loading('Vorlage wird gelöscht…'),
    }),
    onSuccess: (_, { redirectTo }, context) => {
      queryClient.invalidateQueries({ queryKey: templateQueryKeys.all });
      toast.success('Vorlage gelöscht', { id: context?.toastId });
      router.replace(redirectTo);
    },
    onError: (err, _variables, context) => {
      toast.error(
        err instanceof Error ? err.message : 'Fehler beim Löschen der Vorlage',
        { id: context?.toastId }
      );
    },
  });

  return {
    createMutation,
    updateMutation,
    addTemplateFieldMutation,
    updateTemplateFieldMutation,
    deleteTemplateFieldMutation,
    setDefaultCategoriesMutation,
    setTemplateRequiredUserPropertiesMutation,
    deleteTemplateMutation,
    isSaving:
      createMutation.isPending ||
      updateMutation.isPending ||
      addTemplateFieldMutation.isPending ||
      updateTemplateFieldMutation.isPending ||
      deleteTemplateFieldMutation.isPending ||
      setDefaultCategoriesMutation.isPending ||
      setTemplateRequiredUserPropertiesMutation.isPending ||
      deleteTemplateMutation.isPending,
  };
}
