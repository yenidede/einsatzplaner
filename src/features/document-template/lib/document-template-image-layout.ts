export type TemplateImageLayout =
  | 'inline'
  | 'block'
  | 'float-left'
  | 'float-right'
  | 'center'
  | 'absolute';

export const TEMPLATE_IMAGE_LAYOUT_OPTIONS: Array<{
  value: TemplateImageLayout;
  label: string;
}> = [
  { value: 'inline', label: 'Mit Text in Zeile' },
  { value: 'block', label: 'Als Block' },
  { value: 'float-left', label: 'Links mit Textumbruch' },
  { value: 'float-right', label: 'Rechts mit Textumbruch' },
  { value: 'center', label: 'Zentriert' },
  { value: 'absolute', label: 'Frei positionieren' },
];

export function isTemplateImageLayout(
  value: unknown
): value is TemplateImageLayout {
  return TEMPLATE_IMAGE_LAYOUT_OPTIONS.some((option) => option.value === value);
}

export function resolveTemplateImageLayout(
  attrs: Record<string, unknown> | undefined
): TemplateImageLayout {
  if (isTemplateImageLayout(attrs?.layout)) return attrs.layout;
  if (attrs?.mode === 'free') return 'absolute';
  if (attrs?.align === 'center') return 'center';
  return 'block';
}
