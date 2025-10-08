import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UseSessionValidationOptions {
  checkInterval?: number; // in Millisekunden, default: 30 Sekunden
  onTokenExpired?: () => void;
  debug?: boolean; // Debug-Ausgaben aktivieren
}

// Erweiterte Session-Typen für Token-Zugriff
interface ExtendedSession {
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  user?: any;
  expires?: string;
}

export function useSessionValidation({
  checkInterval = 30000, // 30 Sekunden
  onTokenExpired,
  debug = false
}: UseSessionValidationOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hilfsfunktion: JWT Token dekodieren und Ablaufzeit berechnen
  const getTokenInfo = (token: string, tokenType: string) => {
    try {
      // Prüfe ob Token ein JWT ist (3 Teile getrennt durch Punkte)
      const parts = token.split('.');
      if (parts.length !== 3) {
        if (debug) {
          console.warn(`${tokenType} ist kein JWT-Token`);
        }
        return null;
      }

      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const expiresAt = payload.exp;
      
      if (!expiresAt) {
        if (debug) {
          console.warn(`${tokenType} hat kein 'exp' Feld`);
        }
        return null;
      }

      const timeLeft = expiresAt - currentTime;
      
      return {
        expiresAt: new Date(expiresAt * 1000),
        timeLeftSeconds: timeLeft,
        timeLeftMinutes: Math.floor(timeLeft / 60),
        timeLeftHours: Math.floor(timeLeft / 3600),
        isExpired: timeLeft <= 0,
        tokenType
      };
    } catch (error) {
      if (debug) {
        console.error(`Fehler beim Dekodieren des ${tokenType}:`, error);
      }
      return null;
    }
  };

  // Debug-Ausgabe formatieren
  const logTokenInfo = (tokenInfo: ReturnType<typeof getTokenInfo>) => {
    if (!tokenInfo) return;
    
    const { tokenType, timeLeftSeconds, timeLeftMinutes, timeLeftHours, expiresAt, isExpired } = tokenInfo;
    
    if (isExpired) {
      console.log(`🔴 ${tokenType} ist abgelaufen!`);
    } else {
      const timeString = timeLeftHours > 0 
        ? `${timeLeftHours}h ${timeLeftMinutes % 60}m`
        : `${timeLeftMinutes}m ${timeLeftSeconds % 60}s`;
      
      console.log(`🟢 ${tokenType}: ${timeString} verbleibend (läuft ab: ${expiresAt.toLocaleString()})`);
    }
  };

  useEffect(() => {
    // Nur starten wenn Session vorhanden
    if (status !== 'authenticated' || !session) {
      return;
    }

    const validateToken = async () => {
      try {
        if (debug) {
          console.group('🔍 Session Validation Check');
          console.log('Zeitpunkt:', new Date().toLocaleString());
        }

        // Cast session zu erweiterten Typ für Token-Zugriff
        const extendedSession = session as ExtendedSession;

        // Debug: Token-Informationen anzeigen
        if (debug && extendedSession) {
          // Access Token analysieren
          if (extendedSession.accessToken) {
            const accessTokenInfo = getTokenInfo(extendedSession.accessToken, 'Access Token');
            if (accessTokenInfo) logTokenInfo(accessTokenInfo);
          } else {
            console.log('ℹ️ Kein Access Token in Session gefunden');
          }

          // Refresh Token analysieren  
          if (extendedSession.refreshToken) {
            const refreshTokenInfo = getTokenInfo(extendedSession.refreshToken, 'Refresh Token');
            if (refreshTokenInfo) logTokenInfo(refreshTokenInfo);
          } else {
            console.log('ℹ️ Kein Refresh Token in Session gefunden');
          }

          // Session Error anzeigen
          if (extendedSession.error) {
            console.log('🚨 Session Error:', extendedSession.error);
          }

          // Session Expires anzeigen
          if (extendedSession.expires) {
            const expiresAt = new Date(extendedSession.expires);
            const timeLeft = expiresAt.getTime() - Date.now();
            const minutesLeft = Math.floor(timeLeft / (1000 * 60));
            console.log(`⏰ Session läuft ab: ${expiresAt.toLocaleString()} (${minutesLeft} Minuten)`);
          }
        }

        // Prüfe Session-Status über NextAuth
        const response = await fetch('/api/auth/session');
        
        if (!response.ok) {
          if (debug) {
            console.log('❌ Session validation failed - signing out');
          }
          onTokenExpired?.();
          await signOut({
            callbackUrl: '/signin',
            redirect: true,
          });
          return;
        }

        const sessionData = await response.json();
        
        // Prüfe auf Refresh Token Error
        if (sessionData?.error === 'RefreshAccessTokenError') {
          if (debug) {
            console.log('🔴 Refresh Token expired - signing out');
          }
          onTokenExpired?.();
          await signOut({
            callbackUrl: '/signin',
            redirect: true,
          });
        }

        if (debug) {
          console.log('✅ Session validation successful');
          console.groupEnd();
        }

      } catch (error) {
        console.error('Token validation error:', error);
        if (debug) {
          console.groupEnd();
        }
        // Bei Netzwerkfehlern nicht automatisch ausloggen
      }
    };

    // Sofortige erste Prüfung
    validateToken();

    // Interval für regelmäßige Prüfung
    intervalRef.current = setInterval(validateToken, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [session, status, checkInterval, onTokenExpired, debug]);

  // Cleanup bei Component Unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Debug: Manuelle Token-Info Funktion (optional)
  const getDebugInfo = () => {
    if (!session) return null;

    const extendedSession = session as ExtendedSession;

    const info: {
      sessionStatus: string;
      sessionError: string | null;
      sessionExpires?: string;
      accessToken?: ReturnType<typeof getTokenInfo>;
      refreshToken?: ReturnType<typeof getTokenInfo>;
    } = {
      sessionStatus: status,
      sessionError: extendedSession.error || null,
    };

    if (extendedSession.expires) {
      info.sessionExpires = extendedSession.expires;
    }

    if (extendedSession.accessToken) {
      info.accessToken = getTokenInfo(extendedSession.accessToken, 'Access Token');
    }

    if (extendedSession.refreshToken) {
      info.refreshToken = getTokenInfo(extendedSession.refreshToken, 'Refresh Token');
    }

    return info;
  };

  return debug ? { getDebugInfo } : undefined;
}