export function detectChangeType(
  isNew: boolean,
  previousAssignedUsers: string[],
  currentAssignedUsers: string[],
  currentUserId?: string
): string {
  if (isNew) {
    return "create";
  }

  if (previousAssignedUsers.length === 0 && currentAssignedUsers.length > 0) {
    return "assign";
  }
  if (previousAssignedUsers.length > 0 && currentAssignedUsers.length === 0) {
    return "cancel";
  }
  // takeover after the first assignment of a potential einsatz
  if (
    currentUserId &&
    !previousAssignedUsers.includes(currentUserId) &&
    currentAssignedUsers.includes(currentUserId)
  ) {
    return "takeover";
  }
  if (currentAssignedUsers.length > previousAssignedUsers.length) {
    return "assign";
  }

  if (currentAssignedUsers.length < previousAssignedUsers.length) {
    return "cancel";
  }

  return "edit";
}

export function getAffectedUserId(
  previousAssignedUsers: string[],
  currentAssignedUsers: string[]
): string | null {
  const addedUsers = currentAssignedUsers.filter(
    (id) => !previousAssignedUsers.includes(id)
  );
  if (addedUsers.length > 0) {
    return addedUsers[0];
  }

  const removedUsers = previousAssignedUsers.filter(
    (id) => !currentAssignedUsers.includes(id)
  );
  if (removedUsers.length > 0) {
    return removedUsers[0];
  }

  return currentAssignedUsers[0] || null;
}

export function detectChangeTypes(
  isNew: boolean,
  previousAssignedUsers: string[],
  currentAssignedUsers: string[],
  currentUserId?: string
): string[] {
  const changeTypes: string[] = [];
  if (isNew) {
    changeTypes.push("create");

    if (currentAssignedUsers.length > 0) {
      changeTypes.push("assign");
    }

    return changeTypes;
  }

  if (previousAssignedUsers.length === 0 && currentAssignedUsers.length > 0) {
    changeTypes.push("assign");
    return changeTypes;
  }

  if (previousAssignedUsers.length > 0 && currentAssignedUsers.length === 0) {
    changeTypes.push("cancel");
    return changeTypes;
  }

  if (
    currentUserId &&
    previousAssignedUsers.length > 0 &&
    !previousAssignedUsers.includes(currentUserId) &&
    currentAssignedUsers.includes(currentUserId)
  ) {
    changeTypes.push("takeover");
    return changeTypes;
  }

  if (currentAssignedUsers.length > previousAssignedUsers.length) {
    changeTypes.push("assign");
    return changeTypes;
  }

  if (currentAssignedUsers.length < previousAssignedUsers.length) {
    changeTypes.push("cancel");
    return changeTypes;
  }
  changeTypes.push("edit");
  return changeTypes;
}

export function getAffectedUserIds(
  previousAssignedUsers: string[],
  currentAssignedUsers: string[]
): string[] {
  const addedUsers = currentAssignedUsers.filter(
    (id) => !previousAssignedUsers.includes(id)
  );

  if (addedUsers.length > 0) {
    return addedUsers;
  }

  const removedUsers = previousAssignedUsers.filter(
    (id) => !currentAssignedUsers.includes(id)
  );

  if (removedUsers.length > 0) {
    return removedUsers;
  }

  return currentAssignedUsers.length > 0 ? [currentAssignedUsers[0]] : [];
}
