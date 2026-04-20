const capitalizeFirst = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : 'Einsatz';
};

export function getSavingToastMessage(einsatzSingular?: string | null) {
  const label = capitalizeFirst(einsatzSingular);
  return `${label} wird gerade gespeichert. Bitte warten Sie einen Moment, bevor der Eintrag geöffnet wird.`;
}

export function getSavingTooltipText(einsatzSingular?: string | null) {
  const label = capitalizeFirst(einsatzSingular);
  return `${label} wird gespeichert. Bitte warten Sie.`;
}
