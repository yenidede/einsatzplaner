"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserOrganizationByIdAction,
  updateOrganizationAction,
  deleteOrganizationAction,
  type OrganizationUpdateData,
} from "../organization-action";
import { settingsQueryKeys } from "../queryKey";

export function useOrganizations(orgs: string[]) {
  const queries = useQuery({
    queryKey: settingsQueryKeys.organizations(orgs),
    queryFn: () =>
      Promise.all(orgs.map((orgId) => getUserOrganizationByIdAction(orgId))),
    staleTime: 60000,
    enabled: orgs.length > 0,
  });

  return {
    organizations: queries.data,
    isLoading: queries.isLoading,
    error: queries.error,
  };
}

export function useOrganization(orgId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: settingsQueryKeys.organization(orgId),
    queryFn: () => getUserOrganizationByIdAction(orgId),
    enabled: !!orgId,
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: OrganizationUpdateData) =>
      updateOrganizationAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.organization(orgId),
      });
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
