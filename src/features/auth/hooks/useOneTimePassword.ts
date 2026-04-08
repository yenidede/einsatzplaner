'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  sendOneTimePasswordAction,
  verifyOneTimePasswordAction,
} from '@/features/auth/actions';
import { authQueryKeys } from '@/features/auth/queryKeys';

const DEFAULT_CODE_LENGTH = 6;

interface OneTimePasswordStatus {
  challengeId: string | null;
  expiresAt: string | null;
  resendAvailableAt: string | null;
  verified: boolean;
}

interface VerifiedChallengeState {
  challengeId: string | null;
  expiresAt: string | null;
}

const EMPTY_OTP_STATUS: OneTimePasswordStatus = {
  challengeId: null,
  expiresAt: null,
  resendAvailableAt: null,
  verified: false,
};

const EMPTY_VERIFIED_CHALLENGE: VerifiedChallengeState = {
  challengeId: null,
  expiresAt: null,
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function useOneTimePassword({
  email,
  enabled = true,
  autoSend = true,
  codeLength = DEFAULT_CODE_LENGTH,
}: {
  email: string;
  enabled?: boolean;
  autoSend?: boolean;
  codeLength?: number;
}) {
  const queryClient = useQueryClient();
  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const isEmailReady = enabled && isValidEmail(normalizedEmail);
  const [code, setCodeState] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const previousEmailRef = useRef(normalizedEmail);
  const lastAutoSentEmailRef = useRef<string | null>(null);
  const sendRequestKeyRef = useRef<string | null>(null);
  const verifyRequestKeyRef = useRef<string | null>(null);
  const statusRef = useRef<OneTimePasswordStatus>(EMPTY_OTP_STATUS);
  const verifiedChallengeRef = useRef<VerifiedChallengeState>(
    EMPTY_VERIFIED_CHALLENGE
  );

  const statusQuery = useQuery({
    queryKey: authQueryKeys.oneTimePassword.status(normalizedEmail),
    queryFn: async () =>
      (queryClient.getQueryData(
        authQueryKeys.oneTimePassword.status(normalizedEmail)
      ) as OneTimePasswordStatus | undefined) ?? EMPTY_OTP_STATUS,
    initialData: EMPTY_OTP_STATUS,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const verifiedChallengeQuery = useQuery({
    queryKey: authQueryKeys.oneTimePassword.verifiedChallenge(normalizedEmail),
    queryFn: async () =>
      (queryClient.getQueryData(
        authQueryKeys.oneTimePassword.verifiedChallenge(normalizedEmail)
      ) as VerifiedChallengeState | undefined) ?? EMPTY_VERIFIED_CHALLENGE,
    initialData: EMPTY_VERIFIED_CHALLENGE,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const status = statusQuery.data ?? EMPTY_OTP_STATUS;
  const verifiedChallenge =
    verifiedChallengeQuery.data ?? EMPTY_VERIFIED_CHALLENGE;

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    verifiedChallengeRef.current = verifiedChallenge;
  }, [verifiedChallenge]);

  const setStatus = useCallback(
    (targetEmail: string, nextStatus: OneTimePasswordStatus) => {
      statusRef.current = nextStatus;
      queryClient.setQueryData(
        authQueryKeys.oneTimePassword.status(targetEmail),
        nextStatus
      );
    },
    [queryClient]
  );

  const setVerifiedChallenge = useCallback(
    (targetEmail: string, nextChallenge: VerifiedChallengeState) => {
      verifiedChallengeRef.current = nextChallenge;
      queryClient.setQueryData(
        authQueryKeys.oneTimePassword.verifiedChallenge(targetEmail),
        nextChallenge
      );
    },
    [queryClient]
  );

  const sendMutation = useMutation({
    mutationFn: async (requestEmail: string) => {
      const result = await sendOneTimePasswordAction({
        email: requestEmail,
      });

      if (!result?.data) {
        throw new Error(
          result?.serverError ?? 'Der Bestätigungscode konnte nicht gesendet werden.'
        );
      }

      return result.data;
    },
    onSuccess: (result, requestEmail) => {
      setStatus(requestEmail, {
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
        resendAvailableAt: result.resendAvailableAt,
        verified: false,
      });

      setVerifiedChallenge(requestEmail, EMPTY_VERIFIED_CHALLENGE);

      setErrorMessage('');
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Der Bestätigungscode konnte nicht gesendet werden.'
      );
    },
    onSettled: () => {
      sendRequestKeyRef.current = null;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (payload: { email: string; code: string }) => {
      const result = await verifyOneTimePasswordAction(payload);

      if (!result?.data) {
        throw new Error(
          result?.serverError ?? 'Der Bestätigungscode konnte nicht geprüft werden.'
        );
      }

      return result.data;
    },
    onSuccess: (result, payload) => {
      setStatus(payload.email, {
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
        resendAvailableAt: statusRef.current.resendAvailableAt,
        verified: true,
      });

      setVerifiedChallenge(payload.email, {
        challengeId: result.challengeId,
        expiresAt: result.expiresAt,
      });

      setErrorMessage('');
    },
    onError: (error, payload) => {
      setStatus(payload.email, {
        ...statusRef.current,
        verified: false,
      });
      setVerifiedChallenge(payload.email, EMPTY_VERIFIED_CHALLENGE);
      setCodeState('');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Der eingegebene Bestätigungscode konnte nicht geprüft werden. Bitte versuchen Sie es erneut.'
      );
    },
    onSettled: () => {
      verifyRequestKeyRef.current = null;
    },
  });

  const resetLocalState = useCallback(
    (targetEmail: string) => {
      setStatus(targetEmail, EMPTY_OTP_STATUS);
      setVerifiedChallenge(targetEmail, EMPTY_VERIFIED_CHALLENGE);
      setCodeState('');
      setErrorMessage('');
    },
    [setStatus, setVerifiedChallenge]
  );

  useEffect(() => {
    const previousEmail = previousEmailRef.current;

    if (previousEmail !== normalizedEmail) {
      resetLocalState(previousEmail);
      previousEmailRef.current = normalizedEmail;
      lastAutoSentEmailRef.current = null;
      sendRequestKeyRef.current = null;
      verifyRequestKeyRef.current = null;
    }
  }, [normalizedEmail, resetLocalState]);

  useEffect(() => {
    const resendAvailableAt = status.resendAvailableAt
      ? new Date(status.resendAvailableAt).getTime()
      : null;

    if (!resendAvailableAt || resendAvailableAt <= Date.now()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [status.resendAvailableAt]);

  const send = useCallback(async () => {
    if (!isEmailReady) {
      return null;
    }

    const requestKey = normalizedEmail;
    if (sendRequestKeyRef.current === requestKey || sendMutation.isPending) {
      return null;
    }

    sendRequestKeyRef.current = requestKey;
    return sendMutation.mutateAsync(normalizedEmail);
  }, [isEmailReady, normalizedEmail, sendMutation]);

  const resend = useCallback(async () => {
    if (!isEmailReady) {
      return null;
    }

    const resendAvailableAt = status.resendAvailableAt
      ? new Date(status.resendAvailableAt).getTime()
      : 0;

    if (resendAvailableAt > Date.now()) {
      return null;
    }

    return send();
  }, [isEmailReady, send, status.resendAvailableAt]);

  const setCode = useCallback(
    (value: string) => {
      const nextCode = value.replace(/\D/g, '').slice(0, codeLength);
      setCodeState(nextCode);

      if (errorMessage) {
        setErrorMessage('');
      }
    },
    [codeLength, errorMessage]
  );

  const resetCode = useCallback(() => {
    setCodeState('');
    setErrorMessage('');
  }, []);

  useEffect(() => {
    if (!autoSend || !isEmailReady) {
      return;
    }

    if (lastAutoSentEmailRef.current === normalizedEmail) {
      return;
    }

    if (status.challengeId || verifiedChallenge.challengeId) {
      lastAutoSentEmailRef.current = normalizedEmail;
      return;
    }

    lastAutoSentEmailRef.current = normalizedEmail;
    void send().catch(() => null);
  }, [
    autoSend,
    isEmailReady,
    normalizedEmail,
    send,
    status.challengeId,
    verifiedChallenge.challengeId,
  ]);

  useEffect(() => {
    if (!isEmailReady || !status.challengeId || code.length !== codeLength) {
      return;
    }

    const requestKey = `${normalizedEmail}:${code}`;
    if (
      verifyRequestKeyRef.current === requestKey ||
      verifyMutation.isPending ||
      status.verified
    ) {
      return;
    }

    verifyRequestKeyRef.current = requestKey;
    void verifyMutation
      .mutateAsync({
        email: normalizedEmail,
        code,
      })
      .catch(() => null);
  }, [
    code,
    codeLength,
    isEmailReady,
    normalizedEmail,
    status.challengeId,
    status.verified,
    verifyMutation,
  ]);

  const resendRemainingSeconds = useMemo(() => {
    if (!status.resendAvailableAt) {
      return 0;
    }

    const remainingMilliseconds =
      new Date(status.resendAvailableAt).getTime() - currentTimestamp;

    return remainingMilliseconds > 0
      ? Math.ceil(remainingMilliseconds / 1000)
      : 0;
  }, [currentTimestamp, status.resendAvailableAt]);

  return {
    code,
    setCode,
    resetCode,
    send,
    resend,
    isSending: sendMutation.isPending,
    isVerifying: verifyMutation.isPending,
    isVerified: status.verified,
    challengeId: verifiedChallenge.challengeId ?? status.challengeId,
    expiresAt: verifiedChallenge.expiresAt ?? status.expiresAt,
    canResend: resendRemainingSeconds === 0 && !sendMutation.isPending,
    resendRemainingSeconds,
    errorMessage,
  };
}
