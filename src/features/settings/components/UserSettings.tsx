'use client';

import { useState, useEffect } from 'react';
import { useUserSettings } from '../hooks/useUserSettings';
import { useSession } from 'next-auth/react';
import {
  FormField,
  Alert,
  Button,
  FormSection,
} from '../../auth/components/ui/FormComponents';
import { useAlertDialog } from '@/hooks/use-alert-dialog';

interface UserSettingsProps {
  isModal?: boolean;
}

export default function UserSettings({ isModal = false }: UserSettingsProps) {
  const { update: updateSession } = useSession();
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const {
    profile,
    isLoading,
    updateProfile,
    isUpdating,
    fieldErrors,
    error,
    message,
    resetForm,
  } = useUserSettings();

  const [formData, setFormData] = useState({
    email: '',
    firstname: '',
    lastname: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        email: profile.email,
        firstname: profile.firstname,
        lastname: profile.lastname,
      }));
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (
      formData.newPassword &&
      formData.newPassword !== formData.confirmPassword
    ) {
      await showDialog({
        title: 'Passwörter stimmen nicht überein',
        description:
          'Bitte stellen Sie sicher, dass beide Passwörter identisch sind.',
        confirmText: 'OK',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (!profile) return;

      updateProfile({
        id: profile.id,
        salutationId: profile.salutationId,
        email: formData.email,
        firstname: formData.firstname,
        lastname: formData.lastname,
        currentPassword: formData.currentPassword || undefined,
        newPassword: formData.newPassword || undefined,
      });

      // Clear password fields on success
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      // Update NextAuth session
      updateSession();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleReset = () => {
    resetForm();
    if (profile) {
      setFormData({
        email: profile.email,
        firstname: profile.firstname,
        lastname: profile.lastname,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Lädt...</div>;
  }

  return (
    <>
      {AlertDialogComponent}
      <div
        className={`${isModal ? 'p-6' : 'mx-auto max-w-2xl p-6'} bg-white ${
          isModal ? '' : 'rounded-lg shadow-md'
        }`}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Persönliche Accountverwaltung
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Verwalten Sie Ihre persönlichen Daten und Sicherheitseinstellungen
          </p>
        </div>

        {error && (
          <Alert type="error" message={error.message} onClose={() => {}} />
        )}

        {message && (
          <Alert type="success" message={message} onClose={() => {}} />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <FormField
              label="E-Mail-Adresse"
              type="email"
              value={formData.email}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, email: value }))
              }
              error={fieldErrors.email}
              required
              autoComplete="email"
            />

            <FormField
              label="Vorname"
              type="text"
              value={formData.firstname}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, firstname: value }))
              }
              error={fieldErrors.firstname}
              required
              autoComplete="given-name"
            />

            <FormField
              label="Nachname"
              type="text"
              value={formData.lastname}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, lastname: value }))
              }
              error={fieldErrors.lastname}
              required
              autoComplete="family-name"
            />
          </div>

          <FormSection title="Passwort ändern">
            <FormField
              label="Aktuelles Passwort"
              type="password"
              value={formData.currentPassword}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, currentPassword: value }))
              }
              error={fieldErrors.currentPassword}
              autoComplete="current-password"
              placeholder="Nur ausfüllen wenn Sie das Passwort ändern möchten"
            />

            <FormField
              label="Neues Passwort"
              type="password"
              value={formData.newPassword}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, newPassword: value }))
              }
              error={fieldErrors.newPassword}
              autoComplete="new-password"
              placeholder="Mindestens 8 Zeichen"
            />

            <FormField
              label="Neues Passwort bestätigen"
              type="password"
              value={formData.confirmPassword}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, confirmPassword: value }))
              }
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
            />
          </FormSection>

          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isUpdating}
            >
              Zurücksetzen
            </Button>

            <Button
              type="submit"
              variant="primary"
              loading={isUpdating}
              disabled={isUpdating}
            >
              Änderungen speichern
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
