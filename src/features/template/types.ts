import type { einsatz_template } from '@/generated/prisma';

export type TemplateDetailed = einsatz_template & {
  icon_url: string;
};
