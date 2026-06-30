'use server';

import type { Template } from '@pdfme/common';
import { generate } from '@pdfme/generator';
import { getPdfmePlugins } from '@/features/pdf-template/lib/pdf-template-defaults';
import type { PdfTemplateInput } from '@/features/pdf-template/types';

function normalizePdfmeInputValue(value: PdfTemplateInput[string]): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

export async function generatePdfmeDocument(args: {
  template: Template;
  input: PdfTemplateInput;
}): Promise<Uint8Array<ArrayBufferLike>> {
  return generate({
    template: args.template,
    inputs: [
      Object.fromEntries(
        Object.entries(args.input).map(([key, value]) => [
          key,
          normalizePdfmeInputValue(value),
        ])
      ),
    ],
    plugins: getPdfmePlugins(),
  });
}
