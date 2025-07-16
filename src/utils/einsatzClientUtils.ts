// Client-seitige Hilfsfunktionen für Einsatz-Formulare

export function checkHelferWarning(anzahlHelfer: number, minimumHelfer: number = 2): boolean {
  return anzahlHelfer < minimumHelfer;
}

export function validateTimeRange(uhrzeitVon: string, uhrzeitBis: string): boolean {
  const [vonHour, vonMin] = uhrzeitVon.split(':').map(Number);
  const [bisHour, bisMin] = uhrzeitBis.split(':').map(Number);
  const vonMinutes = vonHour * 60 + vonMin;
  const bisMinutes = bisHour * 60 + bisMin;
  return bisMinutes > vonMinutes;
}

export function calculateDuration(uhrzeitVon: string, uhrzeitBis: string): number {
  const [vonHour, vonMin] = uhrzeitVon.split(':').map(Number);
  const [bisHour, bisMin] = uhrzeitBis.split(':').map(Number);
  const vonMinutes = vonHour * 60 + vonMin;
  const bisMinutes = bisHour * 60 + bisMin;
  return bisMinutes - vonMinutes;
}

export function calculateTotalPrice(anzahlTeilnehmer: number, einzelpreis: number): number {
  return anzahlTeilnehmer * einzelpreis;
}
