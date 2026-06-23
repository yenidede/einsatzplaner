export function getPreviewDurationTag(input: { start: string; end: string }) {
  const start = new Date(input.start);
  const end = new Date(input.end);
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const days = Math.round(
    (endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (days <= 0) {
    return null;
  }

  return days === 1 ? '1 Tag' : `${days} Tage`;
}
