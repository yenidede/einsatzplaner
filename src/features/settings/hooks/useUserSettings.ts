'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUserProfileAction,
  updateUserProfileAction,
  uploadProfilePictureAction,
  type UserUpdateData,
} from '../settings-action';
import { useState } from 'react';

const userProfileKey = ['userProfile'];

export function useUserSettings() {
  const queryClient = useQueryClient();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>('');

  const query = useQuery({
    queryKey: userProfileKey,
    queryFn: () => getUserProfileAction(),
    staleTime: 60000,
  });

  const updateProfile = useMutation({
    mutationFn: (data: UserUpdateData) => updateUserProfileAction(data),
    onSuccess: (data) => {
      queryClient.setQueryData(userProfileKey, data);
      setFieldErrors({});
      setMessage('Änderungen erfolgreich gespeichert');
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (error: Error) => {
      if (error.message.includes('password')) {
        setFieldErrors({ currentPassword: error.message });
      } else {
        setFieldErrors({ general: error.message });
      }
      setMessage('');
    },
  });

  const uploadPicture = useMutation({
    mutationFn: (formData: FormData) => uploadProfilePictureAction(formData),
    onSuccess: (data) => {
      queryClient.setQueryData(userProfileKey, (prev: any) => ({
        ...prev,
        picture_url: data.picture_url,
      }));
      setMessage('Profilbild erfolgreich hochgeladen');
      setTimeout(() => setMessage(''), 3000);
    },
    onError: (error: Error) => {
      setFieldErrors({ picture: error.message });
      setMessage('');
    },
  });

  const resetForm = () => {
    setFieldErrors({});
    setMessage('');
    queryClient.invalidateQueries({ queryKey: userProfileKey });
  };

  return {
    profile: query.data,
    isLoading: query.isLoading,
    error: query.error,
    fieldErrors,
    message,
    updateProfile: updateProfile.mutateAsync,
    uploadPicture: uploadPicture.mutateAsync,
    isUpdating: updateProfile.isPending,
    isUploading: uploadPicture.isPending,
    resetForm,
  };
}
