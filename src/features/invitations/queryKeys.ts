export const invitationQueryKeys = {
  all: ["invitations"] as const,
  invitations: (organizationId: string) =>
    [...invitationQueryKeys.all, organizationId] as const,
} as const;
