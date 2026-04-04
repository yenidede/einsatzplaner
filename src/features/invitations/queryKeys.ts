export const invitationQueryKeys = {
  all: ['invitations'] as const,
  invitations: (organizationId: string) =>
    [...invitationQueryKeys.all, organizationId] as const,

  invitation: ['invitation'] as const,
  verify: (token: string) => [...invitationQueryKeys.invitation, token] as const,
} as const;
