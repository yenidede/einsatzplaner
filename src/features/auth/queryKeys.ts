export const authQueryKeys = {
  all: ['auth'] as const,
  selfSignup: {
    all: ['auth', 'self-signup'] as const,
    accountStatus: (email: string) =>
      [...authQueryKeys.selfSignup.all, 'account-status', email] as const,
  },
  oneTimePassword: {
    all: ['auth', 'one-time-password'] as const,
    status: (email: string) =>
      [...authQueryKeys.oneTimePassword.all, 'status', email] as const,
    verifiedChallenge: (email: string) =>
      [...authQueryKeys.oneTimePassword.all, 'verified-challenge', email] as const,
  },
} as const;
