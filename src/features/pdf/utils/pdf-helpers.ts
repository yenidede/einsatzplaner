import type { AssignedUser } from "../types/types";

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return (
    dateObj.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " Uhr"
  );
}

export function formatAssignedUserNames(assignedUsers: AssignedUser[]): string {
  if (assignedUsers.length === 0) return "Wird noch bekannt gegeben";

  const names = assignedUsers
    .map((user) => {
      const firstname = user.firstname ?? "";
      const lastname = user.lastname ?? "";
      const salutation = user.salutation?.salutation.trim() ?? "";
      return salutation
        ? `${salutation} ${firstname} ${lastname}`.trim()
        : `${firstname} ${lastname}`.trim();
    })
    .filter((name) => name.length > 0)
    .join(", ");

  return names || "Wird noch bekannt gegeben";
}

export function formatCurrentUserName(
  currentUser: AssignedUser | null | undefined
): string {

  if (!currentUser) return "Martina Steiner";

  const firstname = currentUser.firstname ?? "";
  const lastname = currentUser.lastname ?? "";
  const salutation = currentUser.salutation?.salutation.trim() ?? "";

  return salutation
    ? `${salutation} ${firstname} ${lastname}`.trim()
    : `${firstname} ${lastname}`.trim();
}

export function getSchulstufe(einsatz: any): string {
  const schulstufeField = einsatz.einsatz_fields?.find((field: any) =>
    field.field?.name?.toLowerCase().includes("schulstufe")
  );
  return schulstufeField?.value || "x";
}
