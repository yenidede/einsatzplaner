'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { isPublicPath } from '@/lib/auth/public-paths';

interface Props {
  children: ReactNode;
}

function SessionValidationWrapper({ children }: Props) {
  const pathname = usePathname();

  useSessionValidation({
    checkInterval: 60000, // Check every minute
    debug: false,
    enabled: pathname ? !isPublicPath(pathname) : true,
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
