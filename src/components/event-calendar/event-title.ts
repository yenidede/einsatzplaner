export function composeCalendarEventTitle(
  title: string,
  ...furtherInformation: Array<string | readonly string[]>
): string {
  // Filtert leere Arrays heraus, erhält Stringwerte inklusive leerer Strings.
  const suffix = furtherInformation
    .filter(
      (information) => typeof information === 'string' || information.length > 0
    )
    .map((information) =>
      Array.isArray(information) ? information.join(', ') : information
    )
    .map((information) => `(${information})`)
    .join('');

  return suffix ? `${title} ${suffix}` : title;
}
