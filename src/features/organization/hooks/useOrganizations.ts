"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserOrganizationsAction,
  getOrganizationAction,
  updateOrganizationAction,
  deleteOrganizationAction,
  type OrganizationUpdateData,
} from "../organization.server";

export function useOrganizations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["organizations"],
    queryFn: () => getUserOrganizationsAction(),
    staleTime: 60000,
  });

  return {
    organizations: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useOrganization(orgId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["organization", orgId],
    queryFn: () => getOrganizationAction(orgId),
    enabled: !!orgId,
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: OrganizationUpdateData) => updateOrganizationAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganizationAction(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  return {
    organization: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateOrganization: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteOrganization: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}