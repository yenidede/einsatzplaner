"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserOrganizationByIdAction,
  updateOrganizationAction,
  uploadOrganizationLogoAction,
  type OrganizationUpdateData,
} from "../organization-action";
import { settingsQueryKeys } from "../queryKey";

export function useOrganizationManage(orgId: string) {
  const queryClient = useQueryClient();

  // Organization data
  const organizationQuery = useQuery({
    queryKey: settingsQueryKeys.organization(orgId),
    queryFn: () => getUserOrganizationByIdAction(orgId),
    enabled: !!orgId,
    staleTime: 60000,
  });

  // Organization members (from organization data)
  const membersQuery = useQuery({
    queryKey: ["organization-members", orgId],
    queryFn: () => getUserOrganizationByIdAction(orgId),
    enabled: !!orgId,
    select: (data) => data.members || [],
    staleTime: 60000,
  });

  // Update organization
  const updateMutation = useMutation({
    mutationFn: (data: OrganizationUpdateData) =>
      updateOrganizationAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.organization(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: ["organization-members", orgId],
      });
    },
  });

  // Upload logo
  const uploadLogoMutation = useMutation({
    mutationFn: (formData: FormData) => uploadOrganizationLogoAction(formData),
    onSuccess: (data) => {
      queryClient.setQueryData(
        settingsQueryKeys.organization(orgId),
        (prev: any) => ({
          ...prev,
          logo_url: data.url,
        })
      );
    },
  });

  return {
    organization: organizationQuery.data,
    isLoadingOrg: organizationQuery.isLoading,
    orgError: organizationQuery.error,
    members: membersQuery.data,
    isLoadingMembers: membersQuery.isLoading,
    updateOrganization: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    uploadLogo: uploadLogoMutation.mutateAsync,
    isUploading: uploadLogoMutation.isPending,
  };
}
