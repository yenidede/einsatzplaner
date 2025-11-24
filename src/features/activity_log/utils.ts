export function detectChangeType(
  isNew: boolean,
  previousAssignedUsers: string[],
  currentAssignedUsers: string[],
  currentUserId?: string
): string {
  if (isNew) {
    return "create";
  }

  if (
    currentUserId &&
    !previousAssignedUsers.includes(currentUserId) &&
    currentAssignedUsers.includes(currentUserId)
  ) {
    return "takeover";
  }

  if (previousAssignedUsers.length === 0 && currentAssignedUsers.length > 0) {
    return "assign";
  }
  if (previousAssignedUsers.length > 0 && currentAssignedUsers.length === 0) {
    return "cancel";
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
