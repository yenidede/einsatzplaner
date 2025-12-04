import { Session } from "next-auth";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

interface UseSessionValidationOptions {
  checkInterval?: number;
  debug?: boolean;
  onTokenExpired?: () => void;
}

function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${remainingMinutes}m`;
  }
}

export function useSessionValidation(
  options: UseSessionValidationOptions = {}
) {
  const { checkInterval = 60000, debug = false, onTokenExpired } = options;
  const { data: session, status } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (status === "authenticated" && session) {
      const validateSession = () => {
        try {
          const tokenInfo = (session as Session).token;
          const now = Date.now();

          if (debug) {
            const accessExpiresIn = tokenInfo?.accessTokenExpires
              ? tokenInfo.accessTokenExpires - now
              : 0;
            const refreshExpiresIn = tokenInfo?.refreshTokenExpires
              ? tokenInfo.refreshTokenExpires - now
              : 0;

            console.log("🔍 Session validation check", {
              timestamp: new Date().toLocaleString(),
              sessionError: session?.error,
              userId: session?.user?.id,
              accessTokenExpires: tokenInfo?.accessTokenExpires
                ? new Date(tokenInfo.accessTokenExpires).toLocaleString()
                : "Unknown",
              refreshTokenExpires: tokenInfo?.refreshTokenExpires
                ? new Date(tokenInfo.refreshTokenExpires).toLocaleString()
                : "Unknown",
              accessTokenExpiresIn:
                accessExpiresIn > 0
                  ? formatTimeRemaining(accessExpiresIn)
                  : "Expired",
              refreshTokenExpiresIn:
                refreshExpiresIn > 0
                  ? formatTimeRemaining(refreshExpiresIn)
                  : "Expired",
            });
          }

          if (session?.error === "RefreshAccessTokenError") {
            if (debug) return;
            onTokenExpired?.();
            signOut({ callbackUrl: "/signin?message=session-expired" });
            return;
          }

          if (
            tokenInfo?.refreshTokenExpires &&
            now > tokenInfo.refreshTokenExpires
          ) {
            if (debug) console.log("❌ Refresh token expired - logging out");
            onTokenExpired?.();
            signOut({ callbackUrl: "/signin?message=token-expired" });
            return;
          }

          if (debug) console.log("✅ Session valid");
        } catch (error) {
          console.error("🚨 Session validation error:", error);
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

  const tokenInfo = session?.token;
  const now = Date.now();

  return {
    isValidating: status === "loading",
    hasValidSession: status === "authenticated" && !session?.error,
    sessionError: session?.error,
    tokenInfo: {
      accessToken: tokenInfo?.accessToken,
      refreshToken: tokenInfo?.refreshToken,
      accessTokenExpires: tokenInfo?.accessTokenExpires,
      refreshTokenExpires: tokenInfo?.refreshTokenExpires,
      accessTokenExpiresInSeconds: tokenInfo?.accessTokenExpires
        ? Math.max(0, Math.floor((tokenInfo.accessTokenExpires - now) / 1000))
        : 0,
      refreshTokenExpiresInSeconds: tokenInfo?.refreshTokenExpires
        ? Math.max(0, Math.floor((tokenInfo.refreshTokenExpires - now) / 1000))
        : 0,
      accessTokenExpiresInFormatted: tokenInfo?.accessTokenExpires
        ? formatTimeRemaining(Math.max(0, tokenInfo.accessTokenExpires - now))
        : "0s",
      refreshTokenExpiresInFormatted: tokenInfo?.refreshTokenExpires
        ? formatTimeRemaining(Math.max(0, tokenInfo.refreshTokenExpires - now))
        : "0s",
      isAccessTokenExpired: tokenInfo?.accessTokenExpires
        ? now > tokenInfo.accessTokenExpires
        : false,
      isRefreshTokenExpired: tokenInfo?.refreshTokenExpires
        ? now > tokenInfo.refreshTokenExpires
        : false,
    },
  };
}
