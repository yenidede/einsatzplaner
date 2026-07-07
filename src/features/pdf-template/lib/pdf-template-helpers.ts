import type { Template } from '@pdfme/common';
import type { Prisma } from '@/generated/prisma';
import type { StoredPdfTemplateDocument } from '../types';
import { createDefaultStoredPdfTemplate } from './pdf-template-defaults';
import { normalizeFooterConfig } from '../lib/pdf-template-footer';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPdfmeTemplate(value: unknown): value is Template {
  if (!isRecord(value)) {
    return false;
  }

  return 'basePdf' in value && 'schemas' in value;
}

export function normalizeStoredPdfTemplateDocument(
  value: unknown
): StoredPdfTemplateDocument {
  if (isRecord(value) && 'template' in value && isPdfmeTemplate(value.template)) {
    return {
      template: value.template,
      meta: isRecord(value.meta)
        ? {
            isDefault:
              typeof value.meta.isDefault === 'boolean'
                ? value.meta.isDefault
                : false,
            version:
              typeof value.meta.version === 'number' ? value.meta.version : 1,
            sampleEinsatzId:
              typeof value.meta.sampleEinsatzId === 'string'
                ? value.meta.sampleEinsatzId
                : null,
            footer: normalizeFooterConfig(value.meta.footer),
          }
        : {
            isDefault: false,
            version: 1,
            sampleEinsatzId: null,
            footer: null,
          },
    };
  }

  if (isPdfmeTemplate(value)) {
    return {
      template: value,
      meta: {
        isDefault: false,
        version: 1,
        sampleEinsatzId: null,
        footer: null,
      },
    };
  }

  return createDefaultStoredPdfTemplate();
}

export function serializeStoredPdfTemplateDocument(
  document: StoredPdfTemplateDocument
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify({
      template: document.template,
      meta: {
        isDefault: document.meta?.isDefault ?? false,
        version: document.meta?.version ?? 1,
        sampleEinsatzId: document.meta?.sampleEinsatzId ?? null,
        footer: document.meta?.footer ?? null,
      },
    })
  ) as Prisma.InputJsonValue;
}

export function slugifyPdfFieldKey(label: string, fallback: string): string {
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalized || fallback;
}
