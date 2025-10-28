import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef } from 'react';

interface UseSessionValidationOptions {
  checkInterval?: number;
  debug?: boolean;
  onTokenExpired?: () => void;
}

export function useSessionValidation(options: UseSessionValidationOptions = {}) {
  const { checkInterval = 60000, debug = false, onTokenExpired } = options;
  const { data: session, status } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (status === 'authenticated' && session) {
      const validateSession = () => {
        try {
          const tokenInfo = (session as any).token;
          const now = Date.now();

          if (debug) {
            console.log('🔍 Session validation check', {
              timestamp: new Date().toLocaleString(),
              sessionError: session?.error,
              userId: session?.user?.id,
              accessTokenExpires: tokenInfo?.accessTokenExpires ?
                new Date(tokenInfo.accessTokenExpires).toLocaleString() : 'Unknown',
              refreshTokenExpires: tokenInfo?.refreshTokenExpires ? 
                new Date(tokenInfo.refreshTokenExpires).toLocaleString() : 'Unknown',
              accessTokenExpiresIn: tokenInfo?.accessTokenExpires ? 
                Math.floor((tokenInfo.accessTokenExpires - now) / 1000) : 'Unknown'
            });
          }

          if (session?.error === "RefreshAccessTokenError") {
            if (debug) console.log('❌ Session error detected - logging out');
            onTokenExpired?.();
            signOut({ callbackUrl: '/signin?message=session-expired' });
            return;
          }

          if (tokenInfo?.refreshTokenExpires && now > tokenInfo.refreshTokenExpires) {
            if (debug) console.log('❌ Refresh token expired - logging out');
            onTokenExpired?.();
            signOut({ callbackUrl: '/signin?message=token-expired' });
            return;
          }

          if (debug) console.log('✅ Session valid');

        } catch (error) {
          console.error('🚨 Session validation error:', error);
        }
      };

      validateSession();
      intervalRef.current = setInterval(validateSession, checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, status, checkInterval, debug, onTokenExpired]);

  const tokenInfo = (session as any)?.token;

  return {
    isValidating: status === 'loading',
    hasValidSession: status === 'authenticated' && !session?.error,
    sessionError: session?.error,
    tokenInfo: {
      accessToken: tokenInfo?.accessToken,
      refreshToken: tokenInfo?.refreshToken,
      accessTokenExpires: tokenInfo?.accessTokenExpires,
      refreshTokenExpires: tokenInfo?.refreshTokenExpires,
      accessTokenExpiresIn: tokenInfo?.accessTokenExpires ? 
        Math.max(0, Math.floor((tokenInfo.accessTokenExpires - Date.now()) / 1000)) : 0,
      refreshTokenExpiresIn: tokenInfo?.refreshTokenExpires ? 
        Math.max(0, Math.floor((tokenInfo.refreshTokenExpires - Date.now()) / 1000)) : 0,
      isAccessTokenExpired: tokenInfo?.accessTokenExpires ? Date.now() > tokenInfo.accessTokenExpires : false,
      isRefreshTokenExpired: tokenInfo?.refreshTokenExpires ? Date.now() > tokenInfo.refreshTokenExpires : false
    }
  };
}