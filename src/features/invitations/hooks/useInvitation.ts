"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InviteUserData } from "@/features/invitations/types/invitation";
import {
  acceptInvitationAction,
  createInvitationAction,
} from "../invitation-action";

export interface UseInvitationReturn {
  loading: boolean;
  error: string;
  success: string;
  sendInvitation: (data: InviteUserData) => Promise<any>;
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
      const mappedData = {
        email: data.email,
        organizationId:
          (data as any).organizationId ?? (data as any).organization_id ?? "",
        roleIds: [(data as any).roleId ?? (data as any).role_id ?? ""].filter(
          Boolean
        ),
      };

      const result = await createInvitationAction(mappedData);
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

export interface UseAcceptInvitationReturn {
  loading: boolean;
  error: string;
  success: string;
  acceptInvitation: (token: string) => Promise<any>;
  clearMessages: () => void;
}

export function useAcceptInvitation(): UseAcceptInvitationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const acceptInvitation = useCallback(async (token: string) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await acceptInvitationAction(token);
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
  }, []);

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
