export function getPdfTemplatesSettingsPath(organizationId: string): string {
  return `/settings/org/${organizationId}/pdf-templates`;
}

export function getPdfTemplateSettingsPath(
  organizationId: string,
  templateId: string
): string {
  return `${getPdfTemplatesSettingsPath(organizationId)}/${templateId}`;
}

export function getEditPdfTemplateSettingsPath(
  organizationId: string,
  templateId: string
): string {
  return `${getPdfTemplateSettingsPath(organizationId, templateId)}/edit`;
}
