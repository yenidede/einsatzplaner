'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  InviteUserFormData,
  CreateInvitationData,
  AcceptInvitationResult,
} from '@/features/invitations/types/invitation';
import {
  acceptInvitationAction,
  createInvitationAction,
} from '../invitation-action';
import { invitationQueryKeys } from '../queryKeys';
import {
  getActiveInvitationsByOrgId,
  getInvitationByToken,
} from '../invitation-dal';

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
  const organizationId = data.organizationId ?? data.organization_id ?? '';
  const roleId = data.roleId ?? data.role_id ?? '';

  if (!organizationId) {
    throw new Error('organizationId is required');
  }
  if (!roleId) {
    throw new Error('roleId is required');
  }

  return {
    email: data.email,
    organizationId,
    roleIds: [roleId],
  };
}

export function useInvitation(): UseInvitationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sendInvitation = useCallback(
    async (data: InviteUserFormData): Promise<AcceptInvitationResult> => {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const mappedData = mapToCreateInvitationData(data);
        const result = await createInvitationAction(mappedData);

        setSuccess('Einladung erfolgreich versendet!');
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Fehler beim Senden der Einladung';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const acceptInvitation = useCallback(
    async (token: string): Promise<AcceptInvitationResult> => {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        const result = await acceptInvitationAction(token);
        setSuccess('Einladung erfolgreich akzeptiert!');
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Fehler beim Annehmen der Einladung';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
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
    queryKey: invitationQueryKeys.invitations(organizationId),
    queryFn: () => getActiveInvitationsByOrgId(organizationId),
    enabled: !!organizationId,
  });
}
export interface InvitationDTO {
  id: string;
  email: string;
  organization_id: string;
  organizationName: string;

  roleName: string;
  roles: { id: string; name: string }[];

  token: string;
  expiresAt: string;
  createdAt: string;
  inviterName: string;
}
interface InvitationValidation {
  valid: boolean;
  invitation?: InvitationDTO;
  error?: string;
}

export function useInvitationValidation(token: string) {
  return useQuery<InvitationValidation>({
    queryKey: [invitationQueryKeys.invitation, token],
    queryFn: async () => {
      const response = await getInvitationByToken(token);
      return response;
    },
    enabled: !!token,
    retry: false,
  });
}
