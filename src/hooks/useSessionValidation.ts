import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

interface UseSessionValidationOptions {
  checkInterval?: number;
  debug?: boolean;
  onTokenExpired?: () => void;
}

interface TokenInfo {
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  refreshTokenExpires?: number;
}

export function useSessionValidation(options: UseSessionValidationOptions = {}) {
  const { checkInterval = 60000, debug = false, onTokenExpired } = options;
  const { data: session, status } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extrahiere Token-Informationen aus der Session
  const extractTokenInfo = (): TokenInfo => {
    if (!session) return {};

    // try multiple locations where tokens might be stored
    // good variable name
    const sessionData = session as any;

    const tokenObj = sessionData.token || sessionData?.accessToken || sessionData?.user?.token || sessionData?.user || {};

    return {
      accessToken: tokenObj.access_token || tokenObj.access_token || sessionData?.user?.accessToken,
      refreshToken: tokenObj.refreshToken || tokenObj.refresh_token || sessionData?.user?.refreshToken,
      accessTokenExpires: tokenObj.accessTokenExpires || tokenObj.access_token_expires,
      refreshTokenExpires: tokenObj.refreshTokenExpires || tokenObj.refresh_token_expires
        || (tokenObj.accessTokenExpires ? tokenObj.accessTokenExpires + (7 * 24 * 60 * 60 * 1000) : undefined)
    };
  };

  const tokenInfo = extractTokenInfo();

  useEffect(() => {
    // Cleanup previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Only start validation if we have a session
    if (status === 'authenticated' && session) {
      const validateSession = async () => {
        try {
          if (debug) {
            console.log('🔍 Session validation check', {
              timestamp: new Date().toLocaleString(),
              sessionExists: !!session,
              sessionError: session?.error,
              userId: session?.user?.id,
              accessToken: tokenInfo.accessToken ? tokenInfo.accessToken : 'Missing',
              refreshToken: tokenInfo.refreshToken ? tokenInfo.refreshToken : 'Missing',
              accessTokenExpires: tokenInfo.accessTokenExpires ?
                new Date(tokenInfo.accessTokenExpires).toLocaleString() : 'Unknown',
              refreshTokenExpires: tokenInfo.refreshTokenExpires ? 
                new Date(tokenInfo.refreshTokenExpires).toLocaleString() : 'Unknown'
            });
          }

          // Check NextAuth session error
          if (session?.error === "RefreshAccessTokenError") {
            if (debug) console.log('❌ NextAuth session error detected');
            onTokenExpired?.();
            await signOut({ callbackUrl: '/signin?message=session-expired' });
            return;
          }

          // Check token expiration times
          const now = Date.now();
          if (tokenInfo.accessTokenExpires && now > tokenInfo.accessTokenExpires) {
            if (debug) console.log('❌ Access token expired');
            onTokenExpired?.();
            await signOut({ callbackUrl: '/signin?message=access-token-expired' });
            return;
          }

          if (tokenInfo.refreshTokenExpires && now > tokenInfo.refreshTokenExpires) {
            if (debug) console.log('❌ Refresh token expired');
            onTokenExpired?.();
            await signOut({ callbackUrl: '/signin?message=refresh-token-expired' });
            return;
          }

          // Test mit einem leichten API-Call (z.B. User-Daten)
          // Das prüft indirekt ob die Tokens noch funktionieren
          if(debug){
                      try {
            const testResponse = await fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include'
            });

            if (!testResponse.ok) {
              console.log('❌ API test failed:', testResponse.status);
              
              if (testResponse.status === 401) {
                onTokenExpired?.();
                await signOut({ callbackUrl: '/signin?message=token-expired' });
              }
            } else {
              console.log('✅ API test successful - tokens valid');
            }
          } catch (networkError) {
            // Bei Netzwerk-Fehlern nichts tun (Offline-Modus)
            console.log('⚠️ Network error during validation, skipping');
          }
          }

      } catch (error) {
          console.error('🚨 Session validation error:', error);
        }
      };

      // Initial check
      validateSession();

      // Set up interval
      intervalRef.current = setInterval(validateSession, checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, status, checkInterval, debug, onTokenExpired, tokenInfo.accessTokenExpires, tokenInfo.refreshTokenExpires]);

  return {
    isValidating: status === 'loading',
    hasValidSession: status === 'authenticated' && !session?.error,
    sessionError: session?.error,
    // ✅ Token-Informationen zurückgeben
    tokenInfo: {
      accessToken: tokenInfo.accessToken,
      refreshToken: tokenInfo.refreshToken,
      accessTokenExpires: tokenInfo.accessTokenExpires,
      refreshTokenExpires: tokenInfo.refreshTokenExpires,
      // Hilfreiche berechnete Werte
      accessTokenExpiresIn: tokenInfo.accessTokenExpires ? 
        Math.max(0, Math.floor((tokenInfo.accessTokenExpires - Date.now()) / 1000)) : 0,
      refreshTokenExpiresIn: tokenInfo.refreshTokenExpires ? 
        Math.max(0, Math.floor((tokenInfo.refreshTokenExpires - Date.now()) / 1000)) : 0,
      isAccessTokenExpired: tokenInfo.accessTokenExpires ? Date.now() > tokenInfo.accessTokenExpires : false,
      isRefreshTokenExpired: tokenInfo.refreshTokenExpires ? Date.now() > tokenInfo.refreshTokenExpires : false
    }
  };
}