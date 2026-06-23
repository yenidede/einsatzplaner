export type EinsatzCriteriaWarningKind =
  | 'helperParticipantRatio'
  | 'userProperties';

export type EinsatzCriteriaWarning = {
  kind: EinsatzCriteriaWarningKind;
  message: string;
};

export function getConfirmableCriteriaWarnings(
  warnings: EinsatzCriteriaWarning[],
  isNewEinsatz: boolean
) {
  if (!isNewEinsatz) {
    return warnings;
  }

  return warnings.filter((warning) => warning.kind !== 'userProperties');
}

export function getInformationalCreateUserPropertyWarnings(
  warnings: EinsatzCriteriaWarning[],
  isNewEinsatz: boolean
) {
  if (!isNewEinsatz) {
    return [];
  }

  return warnings.filter((warning) => warning.kind === 'userProperties');
}

export function shouldValidateRequiredUserProperties(
  requiredUserPropertiesCount: number,
  assignedUsersCount: number
) {
  return requiredUserPropertiesCount > 0 && assignedUsersCount > 0;
}
