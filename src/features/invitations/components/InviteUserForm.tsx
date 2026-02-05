'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [evRole, setEvRole] = useState(false);
  const [ovRole, setOvRole] = useState(false);

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
    onSuccess: () => {
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md gap-0 p-0">
          <DialogHeader className="flex flex-row items-start gap-4 border-b px-6 py-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <Mail className="text-primary h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle>Benutzer einladen</DialogTitle>
                <DialogDescription>
                  Neue Mitglieder zur Organisation hinzufügen
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 p-6">
            {successMessage && (
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-500" />
                <span className="text-sm text-green-800 dark:text-green-200">
                  {successMessage}
                </span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-500" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  {errorMessage}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="beispiel@email.de"
                  disabled={isSubmitting}
                  aria-autocomplete="none"
                />
                <p className="text-muted-foreground text-xs">
                  Die Person erhält eine E-Mail mit einem Einladungslink
                </p>
              </div>

              <div className="space-y-3">
                <Label>Berechtigungen</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="role-helfer"
                      checked={helferRole}
                      onCheckedChange={(checked) =>
                        setHelferRole(checked === true)
                      }
                      disabled={isSubmitting || !helferRoleId}
                    />
                    <Label
                      htmlFor="role-helfer"
                      className="cursor-pointer font-normal"
                    >
                      Helfer
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="role-ev"
                      checked={evRole}
                      onCheckedChange={(checked) => setEvRole(checked === true)}
                      disabled={isSubmitting || !evRoleId}
                    />
                    <Label
                      htmlFor="role-ev"
                      className="cursor-pointer font-normal"
                    >
                      Einsatzverwaltung (EV)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="role-ov"
                      checked={ovRole}
                      onCheckedChange={(checked) => setOvRole(checked === true)}
                      disabled={isSubmitting || !ovRoleId}
                    />
                    <Label
                      htmlFor="role-ov"
                      className="cursor-pointer font-normal"
                    >
                      Organisationsverwaltung (OV)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-md p-3">
                <h4 className="mb-1 text-sm font-medium">
                  Was passiert als nächstes?
                </h4>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• Eine Einladungs-E-Mail wird versendet</li>
                  <li>• Der Link ist 7 Tage gültig</li>
                  <li>• Benutzer erhält die ausgewählten Rollen</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onClose}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting || !email.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sende...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Einladung senden
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

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
                    `Diese Person erhält umfassende Verwaltungsrechte für ${einsatzNamePlural} (erstellen, bearbeiten und löschen) sowie für Ihre Organisation.`}
                  {evRole &&
                    !ovRole &&
                    `Diese Person kann ${einsatzNamePlural} erstellen, bearbeiten und löschen.`}
                  {!evRole &&
                    ovRole &&
                    'Diese Person kann Ihre Organisation verwalten sowie Benutzer hinzufügen und entfernen.'}
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
