import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/features/einsatztemplate/queryKeys';
import {
  getAllTemplatesWithIconByOrgId,
  getAllTemplatesByOrgIds,
  getTemplateWithReuseGraphById,
  getAllTemplateIcons,
  getTemplateFieldReuseCandidatesAction,
} from '@/features/template/template-dal';

export function useTemplate(templateId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.templateWithReuseGraph(templateId ?? ''),
    queryFn: () => getTemplateWithReuseGraphById(templateId ?? ''),
    enabled: !!templateId,
  });
}

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

export function useTemplateIcons() {
  return useQuery({
    queryKey: queryKeys.icons,
    queryFn: () => getAllTemplateIcons(),
  });
}

export function useTemplateFieldReuseCandidates(
  activeOrgId: string | null | undefined,
  excludeTemplateId?: string | null
) {
  return useQuery({
    queryKey: queryKeys.fieldReuseCandidates(
      activeOrgId ?? '',
      excludeTemplateId
    ),
    queryFn: () =>
      getTemplateFieldReuseCandidatesAction(
        activeOrgId ?? '',
        excludeTemplateId
      ),
    enabled: !!activeOrgId,
  });
}
