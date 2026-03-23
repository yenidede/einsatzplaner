import { PdfViewModel } from '@/types/pdfTemplate';

export function interpolateText(text: string, viewModel: PdfViewModel): string {
  // Ersetze alle Tokens sicher
  return text.replace(/\{\{(\w+\.\w+)\}\}/g, (match, token) => {
    const path = token.split('.');
    let value: any = viewModel;
    for (const key of path) {
      value = value?.[key];
    }
    return value || match; // Fallback: Token behalten, wenn nicht gefunden
  });
}
