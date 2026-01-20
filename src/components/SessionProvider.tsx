'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { useSessionValidation } from '@/hooks/useSessionValidation';

interface Props {
  children: ReactNode;
}

function SessionValidationWrapper({ children }: Props) {
  // Validate session globally and handle expiration
  useSessionValidation({
    checkInterval: 60000, // Check every minute
    debug: false,
  });

  return <>{children}</>;
}

export default function NextAuthSessionProvider({ children }: Props) {
  return (
    <SessionProvider>
      <SessionValidationWrapper>{children}</SessionValidationWrapper>
    </SessionProvider>
  );
}
