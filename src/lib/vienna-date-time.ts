export const DOCUMENT_TIME_ZONE = 'Europe/Vienna';

export function createViennaDateFormatter(
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('de-AT', {
    ...options,
    timeZone: DOCUMENT_TIME_ZONE,
  });
}

export const viennaDocumentDateFormatter = createViennaDateFormatter({
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export const viennaDocumentTimeFormatter = createViennaDateFormatter({
  hour: '2-digit',
  minute: '2-digit',
});
