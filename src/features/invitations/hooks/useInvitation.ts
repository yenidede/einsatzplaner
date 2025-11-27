"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InviteUserData } from "@/features/invitations/types/invitation";

export interface UseInvitationReturn {
  loading: boolean;
  error: string;
  success: string;
  sendInvitation: (data: InviteUserData) => Promise<void>;
  clearMessages: () => void;
}

export function useInvitation(): UseInvitationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendInvitation = useCallback(async (data: InviteUserData) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/invitations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setSuccess("Einladung erfolgreich versendet!");

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Fehler beim Senden der Einladung";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  return {
    loading,
    error,
    success,
    sendInvitation,
    clearMessages,
  };
}

// Hook für Einladungsannahme
export interface UseAcceptInvitationReturn {
  loading: boolean;
  error: string;
  success: string;
  acceptInvitation: (
    token: string,
    password: string,
    confirmPassword: string
  ) => Promise<void>;
  clearMessages: () => void;
}

export function useAcceptInvitation(): UseAcceptInvitationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const acceptInvitation = useCallback(
    async (token: string, password: string, confirmPassword: string) => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const response = await fetch("/api/invitations/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
            confirmPassword,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        setSuccess("Einladung erfolgreich akzeptiert!");

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Fehler beim Annehmen der Einladung";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  return {
    loading,
    error,
    success,
    acceptInvitation,
    clearMessages,
  };
}

export function useInvitations(organizationId: string) {
  return useQuery({
    queryKey: ["invitations", organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/invitations?orgId=${organizationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }
      return response.json();
    },
    enabled: !!organizationId,
  });
}

export function useInvitationValidation(token: string) {
  return useQuery({
    queryKey: ["invitation", token],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/${token}`);
      if (!response.ok) {
        throw new Error("Failed to validate invitation");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });
}
