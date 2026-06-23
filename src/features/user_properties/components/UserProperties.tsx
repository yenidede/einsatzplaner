'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Step, PropertyConfig, FieldType } from '../types';
import { INITIAL_CONFIG } from '../types';
import { PropertyOverview } from './PropertyOverview';
import { FieldTypeSelector } from './FieldTypeSelector';
import { PropertyConfiguration } from './PropertyConfiguration';
import { fieldToPropertyConfig } from '../utils/field-to-property-config';
import {
  createUserPropertyAction,
  deleteUserPropertyAction,
  updateUserPropertyAction,
} from '../user_property-actions';
import { userPropertyQueryKeys } from '../queryKeys';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import {
  useUserPropertiesByOrg,
  useExistingPropertyNames,
  useUserCount,
} from '../hooks/use-user-property-queries';

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
  const { showDestructive } = useConfirmDialog();

  const { data: properties, isLoading: propertiesLoading } =
    useUserPropertiesByOrg(organizationId);

  const { data: existingNames = [] } = useExistingPropertyNames(organizationId);

  const { data: userCount = 0 } = useUserCount(organizationId);

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

    const editConfig = fieldToPropertyConfig(property.field);

    if (!editConfig) {
      toast.error(
        `Ungültiger Feldtyp: ${property.field.type?.datatype}. Eigenschaft kann nicht bearbeitet werden.`
      );
      console.error('Invalid field type:', property.field.type?.datatype);
      return;
    }

    setConfig(editConfig);
    setEditingPropertyId(propertyId);
    setOriginalPropertyName(property.field.name || '');
    setCurrentStep('configuration');
  };

  const handleDelete = async (propertyId: string) => {
    const property = properties?.find((p) => p.id === propertyId);
    if (!property) return;

    const result = await showDestructive(
      'Eigenschaft löschen',
      `Möchten Sie die Eigenschaft "${property.field.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      {
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      }
    );

    if (result === 'success') {
      deleteMutation.mutate(propertyId);
    }
  };

  const filteredExistingNames = editingPropertyId
    ? existingNames.filter(
        (name) => name.toLowerCase() !== originalPropertyName.toLowerCase()
      )
    : existingNames;

  const editingProperty =
    editingPropertyId != null
      ? properties?.find((property) => property.id === editingPropertyId)
      : undefined;

  const propertyUsageInfo =
    editingProperty == null ? null : (
      <p>
        {editingProperty.userCount && editingProperty.userCount > 0
          ? `Dieses Feld ist aktuell bei ${editingProperty.userCount} Person${
              editingProperty.userCount === 1 ? '' : 'en'
            } hinterlegt.`
          : 'Dieses Feld ist aktuell noch bei keiner Person hinterlegt.'}
      </p>
    );

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
            usageInfo={propertyUsageInfo}
          />
        </>
      );

    default:
      return null;
  }
}
