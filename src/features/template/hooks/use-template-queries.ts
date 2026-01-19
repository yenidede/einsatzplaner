import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatztemplate/queryKeys';
import { getAllTemplatesWithIconByOrgId, getAllTemplatesByOrgIds } from '@/features/template/template-dal';

export function useTemplates(activeOrgId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.templates(activeOrgId ? [activeOrgId] : []),
    queryFn: () => getAllTemplatesWithIconByOrgId(activeOrgId ?? ''),
    enabled: !!activeOrgId,
  });
}

export function useTemplatesByOrgIds(orgIds: string[]) {
  return useQuery({
    queryKey: queryKeys.templates(orgIds),
    queryFn: () => getAllTemplatesByOrgIds(orgIds),
    enabled: orgIds.length > 0,
  });
}
