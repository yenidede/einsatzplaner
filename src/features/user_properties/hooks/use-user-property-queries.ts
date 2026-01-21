import { useQuery } from '@tanstack/react-query';
import { userPropertyQueryKeys } from '@/features/user_properties/queryKeys';
import { getUserPropertiesByOrgId } from '@/features/user_properties/user_property-dal';
import {
  getUserPropertiesAction,
  getExistingPropertyNamesAction,
  getUserCountAction,
} from '@/features/user_properties/user_property-actions';

export function useUserProperties(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: userPropertyQueryKeys.byOrg(activeOrgId ?? ''),
    queryFn: () => getUserPropertiesByOrgId(activeOrgId ?? ''),
    enabled: !!activeOrgId,
  });
}

export function useUserPropertiesByOrg(organizationId: string | undefined) {
  return useQuery({
    queryKey: userPropertyQueryKeys.byOrg(organizationId ?? ''),
    queryFn: () => getUserPropertiesAction(organizationId ?? ''),
    enabled: !!organizationId,
  });
}

export function useExistingPropertyNames(organizationId: string | undefined) {
  return useQuery({
    queryKey: userPropertyQueryKeys.names(organizationId ?? ''),
    queryFn: () => getExistingPropertyNamesAction(organizationId ?? ''),
    enabled: !!organizationId,
  });
}

export function useUserCount(organizationId: string | undefined) {
  return useQuery({
    queryKey: userPropertyQueryKeys.userCount(organizationId ?? ''),
    queryFn: () => getUserCountAction(organizationId ?? ''),
    enabled: !!organizationId,
  });
}
