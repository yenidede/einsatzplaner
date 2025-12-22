"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  InviteUserFormData,
  CreateInvitationData,
  AcceptInvitationResult,
  Invitation,
} from "@/features/invitations/types/invitation";
import {
  acceptInvitationAction,
  createInvitationAction,
} from "../invitation-action";
import { invitationQueryKeys } from "../queryKeys";

export interface UseInvitationReturn {
  loading: boolean;
  error: string;
  success: string;
  sendInvitation: (data: InviteUserFormData) => Promise<AcceptInvitationResult>;
  clearMessages: () => void;
}

function mapToCreateInvitationData(
  data: InviteUserFormData
): CreateInvitationData {
  const organizationId = data.organizationId ?? data.organization_id ?? "";
  const roleId = data.roleId ?? data.role_id ?? "";

  if (!organizationId) {
    throw new Error("organizationId is required");
  }
  if (!roleId) {
    throw new Error("roleId is required");
  }

  return {
    email: data.email,
    organizationId,
    roleIds: [roleId],
  };
}

export function useInvitation(): UseInvitationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const sendInvitation = useCallback(
    async (data: InviteUserFormData): Promise<AcceptInvitationResult> => {
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const mappedData = mapToCreateInvitationData(data);
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
    sendInvitation,
    clearMessages,
  };
}

export interface UseAcceptInvitationReturn {
  loading: boolean;
  error: string;
  success: string;
  acceptInvitation: (token: string) => Promise<AcceptInvitationResult>;
  clearMessages: () => void;
}

export function useAcceptInvitation(): UseAcceptInvitationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const acceptInvitation = useCallback(
    async (token: string): Promise<AcceptInvitationResult> => {
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
  return useQuery<Invitation[]>({
    queryKey: invitationQueryKeys.invitations(organizationId),
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

interface InvitationValidation {
  valid: boolean;
  invitation?: Invitation;
  error?: string;
}

export function useInvitationValidation(token: string) {
  return useQuery<InvitationValidation>({
    queryKey: [invitationQueryKeys.invitation, token],
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
