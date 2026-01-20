'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { invitationQueryKeys } from '../queryKeys';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createInvitationAction } from '../invitation-action';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/features/organization/hooks/use-organization-queries';
import { useRoles } from '@/features/roles/hooks/use-roles-queries';

interface InviteUserFormProps {
  organizationId: string;
  onClose: () => void;
  isOpen: boolean;
}

interface Role {
  id: string;
  name: string;
  abbreviation: string | null;
}

export function InviteUserForm({
  organizationId,
  onClose,
  isOpen,
}: InviteUserFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Rollen-States (default alle aktiviert)
  const [helferRole, setHelferRole] = useState(true);
  const [evRole, setEvRole] = useState(true);
  const [ovRole, setOvRole] = useState(true);

  // Bestätigungs-Dialog State
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<{
    email: string;
    roleIds: string[];
  } | null>(null);

  const queryClient = useQueryClient();

  // Organisation-Daten über Server Action laden
  const { data: organizationData } = useOrganization(organizationId);

  // Rollen über Server Action laden
  const { data: rolesData } = useRoles();
  const einsatzNamePlural = organizationData?.einsatz_name_plural || 'Einsätze';

  // Rollen-IDs dynamisch aus DB holen
  const helferRoleId = rolesData?.find((r) => r.name === 'Helfer')?.id;
  const evRoleId = rolesData?.find((r) => r.name === 'Einsatzverwaltung')?.id;
  const ovRoleId = rolesData?.find(
    (r) => r.name === 'Organisationsverwaltung'
  )?.id;

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; roleIds: string[] }) => {
      return createInvitationAction({
        email: data.email,
        organizationId,
        roleIds: data.roleIds,
      });
    },
    onSuccess: (data) => {
      setSuccessMessage(
        `Einladung erfolgreich an ${pendingFormData?.email || email} gesendet!`
      );
      setEmail('');
      setErrorMessage('');
      setPendingFormData(null);

      // Rollen zurücksetzen auf default
      setHelferRole(true);
      setEvRole(true);
      setOvRole(true);

      queryClient.invalidateQueries({
        queryKey: invitationQueryKeys.invitations(organizationId),
      });

      // Auto-close nach 3 Sekunden
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setSuccessMessage('');
      setPendingFormData(null);
    },
  });

  const getRoleIds = () => {
    const roleIds: string[] = [];
    if (helferRole && helferRoleId) roleIds.push(helferRoleId);
    if (evRole && evRoleId) roleIds.push(evRoleId);
    if (ovRole && ovRoleId) roleIds.push(ovRoleId);
    return roleIds;
  };

  const getSelectedRoleNames = () => {
    const names: string[] = [];
    if (helferRole) names.push('Helfer');
    if (evRole) names.push(`Einsatzverwaltung`);
    if (ovRole) names.push('Organisationsverwaltung');
    return names;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Bitte geben Sie eine E-Mail-Adresse ein');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Bitte geben Sie eine gültige E-Mail-Adresse ein');
      return;
    }

    const roleIds = getRoleIds();
    if (roleIds.length === 0) {
      setErrorMessage('Bitte wählen Sie mindestens eine Rolle aus');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    // Warnung nur anzeigen wenn EV oder OV ausgewählt sind
    if (evRole || ovRole) {
      setPendingFormData({ email, roleIds });
      setShowConfirmDialog(true);
    } else {
      // Direkt absenden ohne Warnung
      await sendInvitation({ email, roleIds });
    }
  };

  const sendInvitation = async (data: { email: string; roleIds: string[] }) => {
    setIsSubmitting(true);
    try {
      await inviteMutation.mutateAsync(data);
      toast.success('Einladung erfolgreich gesendet.');
    } catch (error) {
      toast.error('Fehler beim Senden der Einladung.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmInvitation = async () => {
    if (pendingFormData) {
      setShowConfirmDialog(false);
      await sendInvitation(pendingFormData);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmDialog(false);
    setPendingFormData(null);
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Benutzer einladen
                </h2>
                <p className="text-sm text-slate-600">
                  Neue Mitglieder zur Organisation hinzufügen
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6">
            {successMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800">{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-800">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="beispiel@email.de"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  autoComplete="email"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Die Person erhält eine E-Mail mit einem Einladungslink
                </p>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-slate-700">
                  Berechtigungen
                </label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      id="role-helfer"
                      checked={helferRole}
                      onCheckedChange={(checked) =>
                        setHelferRole(checked === true)
                      }
                      disabled={isSubmitting || !helferRoleId}
                    />
                    <label
                      htmlFor="role-helfer"
                      className="cursor-pointer text-sm text-slate-700 select-none"
                    >
                      <span className="font-medium">Helfer</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Checkbox
                      id="role-ev"
                      checked={evRole}
                      onCheckedChange={(checked) => setEvRole(checked === true)}
                      disabled={isSubmitting || !evRoleId}
                    />
                    <label
                      htmlFor="role-ev"
                      className="cursor-pointer text-sm text-slate-700 select-none"
                    >
                      <span className="font-medium">
                        Einsatzverwaltung (EV)
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-4">
                    <Checkbox
                      id="role-ov"
                      checked={ovRole}
                      onCheckedChange={(checked) => setOvRole(checked === true)}
                      disabled={isSubmitting || !ovRoleId}
                    />
                    <label
                      htmlFor="role-ov"
                      className="cursor-pointer text-sm text-slate-700 select-none"
                    >
                      <span className="font-medium">
                        Organisationsverwaltung (OV)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 p-3">
                <h4 className="mb-1 text-sm font-medium text-blue-900">
                  Was passiert als nächstes?
                </h4>
                <ul className="space-y-1 text-xs text-blue-700">
                  <li>• Eine Einladungs-E-Mail wird versendet</li>
                  <li>• Der Link ist 7 Tage gültig</li>
                  <li>• Benutzer erhält die ausgewählten Rollen</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sende...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Einladung senden
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Erweiterte Berechtigungen bestätigen
            </AlertDialogTitle>
            <div className="space-y-2">
              <AlertDialogDescription className="space-y-2">
                Sind Sie sicher, dass <b>{pendingFormData?.email}</b> mit
                erweiterten Berechtigungen hinzugefügt werden soll? Dies kann
                schwerwiegende Folgen haben.
              </AlertDialogDescription>
              <div className="text-sm">
                <p>Ausgewählte Rollen: </p>
                <ul className="ml-4 list-disc">
                  {getSelectedRoleNames().map((role, index) => (
                    <li key={index}>{role}</li>
                  ))}
                </ul>
                <div className="mt-2 text-sm font-bold">
                  {evRole &&
                    ovRole &&
                    `Diese Person erhält umfassende Verwaltungsrechte für ${einsatzNamePlural} (erstellen, bearbeiten und löschen) sowie für deine Organisation.`}
                  {evRole &&
                    !ovRole &&
                    `Diese Person kann ${einsatzNamePlural} erstellen, bearbeiten und löschen.`}
                  {!evRole &&
                    ovRole &&
                    'Diese Person kann deine Organisation verwalten sowie Benutzer hinzufügen und entfernen.'}
                </div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button asChild variant={'outline'}>
              <AlertDialogCancel onClick={handleCancelConfirmation}>
                Abbrechen
              </AlertDialogCancel>
            </Button>
            <Button asChild variant={'destructive'}>
              <AlertDialogAction onClick={handleConfirmInvitation}>
                Ja, Einladung senden
              </AlertDialogAction>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
