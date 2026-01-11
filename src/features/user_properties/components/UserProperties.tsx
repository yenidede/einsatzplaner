'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Step, PropertyConfig, FieldType } from '../types';
import { INITIAL_CONFIG } from '../types';
import { PropertyOverview } from './PropertyOverview';
import { FieldTypeSelector } from './FieldTypeSelector';
import { PropertyConfiguration } from './PropertyConfiguration';
import {
  getUserPropertiesAction,
  getExistingPropertyNamesAction,
  getUserCountAction,
  createUserPropertyAction,
  deleteUserPropertyAction,
  updateUserPropertyAction,
} from '../user_property-actions';
import { userPropertyQueryKeys } from '../queryKeys';
import { useAlertDialog } from '@/hooks/use-alert-dialog';

interface UserPropertiesProps {
  organizationId: string;
}

export function UserProperties({ organizationId }: UserPropertiesProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>('overview');
  const [config, setConfig] = useState<PropertyConfig>(INITIAL_CONFIG);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(
    null
  );
  const [originalPropertyName, setOriginalPropertyName] = useState<string>('');
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: userPropertyQueryKeys.byOrg(organizationId),
    queryFn: () => getUserPropertiesAction(organizationId),
  });

  const { data: existingNames = [] } = useQuery({
    queryKey: userPropertyQueryKeys.names(organizationId),
    queryFn: () => getExistingPropertyNamesAction(organizationId),
  });

  const { data: userCount = 0 } = useQuery({
    queryKey: userPropertyQueryKeys.userCount(organizationId),
    queryFn: () => getUserCountAction(organizationId),
  });

  const createMutation = useMutation({
    mutationFn: (config: PropertyConfig) =>
      createUserPropertyAction(config, organizationId),
    onMutate: () => {
      return { toastId: toast.loading('Eigenschaft wird erstellt...') };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Eigenschaft erfolgreich erstellt!', {
        id: context.toastId,
      });
      queryClient.invalidateQueries({
        queryKey: userPropertyQueryKeys.byOrg(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: userPropertyQueryKeys.names(organizationId),
      });
      handleCancel();
    },
    onError: (error, variables, context) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Erstellen der Eigenschaft',
        { id: context?.toastId }
      );
      console.error('Create property error:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config: PropertyConfig }) =>
      updateUserPropertyAction(id, config),
    onMutate: () => {
      return { toastId: toast.loading('Eigenschaft wird aktualisiert...') };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Eigenschaft erfolgreich aktualisiert!', {
        id: context.toastId,
      });
      queryClient.invalidateQueries({
        queryKey: userPropertyQueryKeys.byOrg(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: userPropertyQueryKeys.names(organizationId),
      });
      handleCancel();
    },
    onError: (error, variables, context) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Aktualisieren der Eigenschaft',
        { id: context?.toastId }
      );
      console.error('Update property error:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (propertyId: string) => deleteUserPropertyAction(propertyId),
    onMutate: () => {
      return { toastId: toast.loading('Eigenschaft wird gelöscht...') };
    },
    onSuccess: (data, variables, context) => {
      toast.success('Eigenschaft erfolgreich gelöscht!', {
        id: context.toastId,
      });
      queryClient.invalidateQueries({
        queryKey: userPropertyQueryKeys.byOrg(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: userPropertyQueryKeys.names(organizationId),
      });
    },
    onError: (error, variables, context) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Löschen der Eigenschaft',
        { id: context?.toastId }
      );
      console.error('Delete property error:', error);
    },
  });

  const handleFieldTypeSelect = (type: FieldType) => {
    setConfig({ ...config, fieldType: type });
    setCurrentStep('configuration');
  };

  const handleConfigChange = (updates: Partial<PropertyConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const handleSave = () => {
    if (editingPropertyId) {
      updateMutation.mutate({ id: editingPropertyId, config });
    } else {
      createMutation.mutate(config);
    }
  };

  const handleCancel = () => {
    setCurrentStep('overview');
    setConfig(INITIAL_CONFIG);
    setEditingPropertyId(null);
    setOriginalPropertyName('');
  };

  const handleEdit = (propertyId: string) => {
    const property = properties?.find((p) => p.id === propertyId);
    if (!property) return;

    const datatype = property.field.type?.datatype;

    const isValidFieldType = (value: unknown): value is FieldType => {
      return (
        typeof value === 'string' &&
        ['text', 'number', 'boolean', 'select'].includes(value)
      );
    };

    if (!datatype || !isValidFieldType(datatype)) {
      toast.error(
        `Ungültiger Feldtyp: ${datatype}. Eigenschaft kann nicht bearbeitet werden.`
      );
      console.error('Invalid field type:', datatype);
      return;
    }

    const fieldType: FieldType = datatype;

    const editConfig: PropertyConfig = {
      name: property.field.name || '',
      description: '',
      fieldType,
      placeholder: property.field.placeholder || '',
      maxLength: property.field.max !== null ? property.field.max : undefined,
      isMultiline: property.field.is_multiline || false,
      minValue: property.field.min !== null ? property.field.min : undefined,
      maxValue: property.field.max !== null ? property.field.max : undefined,
      isDecimal: false,
      trueLabel: 'Ja',
      falseLabel: 'Nein',
      booleanDefaultValue: null,
      options: property.field.allowed_values || [],
      defaultOption: property.field.default_value || undefined,
      isRequired: property.field.is_required,
      defaultValue: property.field.default_value || '',
    };

    setConfig(editConfig);
    setEditingPropertyId(propertyId);
    setOriginalPropertyName(property.field.name || '');
    setCurrentStep('configuration');
  };

  const handleDelete = async (propertyId: string) => {
    const property = properties?.find((p) => p.id === propertyId);
    if (!property) return;

    const confirmed = await showDialog({
      title: 'Eigenschaft löschen',
      description: `Möchten Sie die Eigenschaft "${property.field.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
    });

    if (confirmed === 'success') {
      deleteMutation.mutate(propertyId);
    }
  };

  const filteredExistingNames = editingPropertyId
    ? existingNames.filter(
        (name) => name.toLowerCase() !== originalPropertyName.toLowerCase()
      )
    : existingNames;

  switch (currentStep) {
    case 'overview':
      return (
        <>
          <PropertyOverview
            onCreateNew={() => setCurrentStep('typeSelection')}
            onCancel={handleCancel}
            properties={properties}
            isLoading={propertiesLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          {AlertDialogComponent}
        </>
      );

    case 'typeSelection':
      return (
        <>
          <PropertyOverview
            onCreateNew={() => setCurrentStep('typeSelection')}
            onCancel={handleCancel}
            properties={properties}
            isLoading={propertiesLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showCreateForm={true}
          />
          <FieldTypeSelector
            onSelectType={handleFieldTypeSelect}
            onBack={() => setCurrentStep('overview')}
          />
          {AlertDialogComponent}
        </>
      );

    case 'configuration':
      return (
        <>
          <PropertyOverview
            onCreateNew={() => setCurrentStep('typeSelection')}
            onCancel={handleCancel}
            properties={properties}
            isLoading={propertiesLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            hideActions={true}
          />
          <PropertyConfiguration
            config={config}
            onConfigChange={handleConfigChange}
            onSave={handleSave}
            onCancel={handleCancel}
            existingPropertyNames={filteredExistingNames}
            existingUserCount={userCount}
          />
          {AlertDialogComponent}
        </>
      );

    default:
      return null;
  }
}
