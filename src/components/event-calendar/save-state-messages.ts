const capitalizeFirst = (value?: string | null) =>
  value && value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : 'Einsatz';

export function getSavingToastMessage(einsatzSingular?: string | null) {
  const label = capitalizeFirst(einsatzSingular);
  return `${label} wird gerade gespeichert. Bitte warten Sie einen Moment, bevor Sie ihn öffnen.`;
}

export function getSavingTooltipText(einsatzSingular?: string | null) {
  const label = capitalizeFirst(einsatzSingular);
  return `${label} wird gespeichert. Bitte warten Sie.`;
}
