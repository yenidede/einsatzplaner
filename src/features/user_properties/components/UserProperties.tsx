"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Step, PropertyConfig, FieldType } from "../types";
import { INITIAL_CONFIG } from "../types";
import { PropertyOverview } from "./PropertyOverview";
import { FieldTypeSelector } from "./FieldTypeSelector";
import { PropertyConfiguration } from "./PropertyConfiguration";
import {
  getUserPropertiesAction,
  getExistingPropertyNamesAction,
  getUserCountAction,
  createUserPropertyAction,
} from "../user_property-actions";
import { userPropertyQueryKeys } from "../queryKeys";

interface UserPropertiesProps {
  organizationId: string;
}

export function UserProperties({ organizationId }: UserPropertiesProps) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<Step>("overview");
  const [config, setConfig] = useState<PropertyConfig>(INITIAL_CONFIG);

  // Query: Lade existierende Properties
  const { data: properties, isLoading: propertiesLoading } = useQuery({
    queryKey: userPropertyQueryKeys.byOrg(organizationId),
    queryFn: () => getUserPropertiesAction(organizationId),
  });

  // Query: Lade existierende Namen
  const { data: existingNames = [] } = useQuery({
    queryKey: userPropertyQueryKeys.names(organizationId),
    queryFn: () => getExistingPropertyNamesAction(organizationId),
  });

  // Query: Lade User-Anzahl
  const { data: userCount = 0 } = useQuery({
    queryKey: userPropertyQueryKeys.userCount(organizationId),
    queryFn: () => getUserCountAction(organizationId),
  });

  // Mutation: Erstelle neue Property
  const createMutation = useMutation({
    mutationFn: (config: PropertyConfig) =>
      createUserPropertyAction(config, organizationId),
    onMutate: () => {
      return { toastId: toast.loading("Eigenschaft wird erstellt...") };
    },
    onSuccess: (data, variables, context) => {
      toast.success("Eigenschaft erfolgreich erstellt!", {
        id: context.toastId,
      });
      // Invalidiere alle relevanten Queries
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
          : "Fehler beim Erstellen der Eigenschaft",
        { id: context?.toastId }
      );
      console.error("Create property error:", error);
    },
  });

  const handleFieldTypeSelect = (type: FieldType) => {
    setConfig({ ...config, fieldType: type });
    setCurrentStep("configuration");
  };

  const handleConfigChange = (updates: Partial<PropertyConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const handleSave = () => {
    createMutation.mutate(config);
  };

  const handleCancel = () => {
    setCurrentStep("overview");
    setConfig(INITIAL_CONFIG);
  };

  // Rendere basierend auf aktuellem Step
  switch (currentStep) {
    case "overview":
      return (
        <PropertyOverview
          onCreateNew={() => setCurrentStep("typeSelection")}
          onCancel={handleCancel}
          properties={properties}
          isLoading={propertiesLoading}
        />
      );

    case "typeSelection":
      return (
        <FieldTypeSelector
          onSelectType={handleFieldTypeSelect}
          onBack={() => setCurrentStep("overview")}
        />
      );

    case "configuration":
      return (
        <PropertyConfiguration
          config={config}
          onConfigChange={handleConfigChange}
          onSave={handleSave}
          onCancel={handleCancel}
          existingPropertyNames={existingNames}
          existingUserCount={userCount}
        />
      );

    default:
      return null;
  }
}
