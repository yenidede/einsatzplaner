"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { invitationQueryKeys } from "../queryKeys";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getEinsatzNamesByOrgId,
  getAllRolesExceptSuperAdmin,
} from "@/features/settings/organization-action";
import { createInvitationAction } from "../invitation-action";
import { Button } from "@/components/ui/button";

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
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
  const { data: organizationData } = useQuery({
    queryKey: ["organization", organizationId],
    queryFn: () => getEinsatzNamesByOrgId(organizationId),
    enabled: isOpen && !!organizationId,
  });

  // Rollen über Server Action laden
  const { data: rolesData } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: () => getAllRolesExceptSuperAdmin(),
    staleTime: 1000 * 60 * 5, // 5 Minuten Cache
  });
  const einsatzNamePlural = organizationData?.einsatz_name_plural || "Einsätze";

  // Rollen-IDs dynamisch aus DB holen
  const helferRoleId = rolesData?.find((r) => r.name === "Helfer")?.id;
  const evRoleId = rolesData?.find((r) => r.name === "Einsatzverwaltung")?.id;
  const ovRoleId = rolesData?.find(
    (r) => r.name === "Organisationsverwaltung"
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
      setEmail("");
      setErrorMessage("");
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
        setSuccessMessage("");
      }, 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setSuccessMessage("");
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
    if (helferRole) names.push("Helfer");
    if (evRole) names.push(`${einsatzNamePlural}verwaltung`);
    if (ovRole) names.push("Organisationsverwaltung");
    return names;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Bitte geben Sie eine E-Mail-Adresse ein");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      return;
    }

    const roleIds = getRoleIds();
    if (roleIds.length === 0) {
      setErrorMessage("Bitte wählen Sie mindestens eine Rolle aus");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

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
      toast.success("Einladung erfolgreich gesendet.");
    } catch (error) {
      toast.error("Fehler beim Senden der Einladung.");
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
        className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
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
              className="p-2 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-6">
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-green-800 text-sm">{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 text-sm">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-2"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  autoComplete="email"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Die Person erhält eine E-Mail mit einem Einladungslink
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
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
                      className="text-sm text-slate-700 cursor-pointer select-none"
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
                      className="text-sm text-slate-700 cursor-pointer select-none"
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
                      className="text-sm text-slate-700 cursor-pointer select-none"
                    >
                      <span className="font-medium">
                        Organisationsverwaltung (OV)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Was passiert als nächstes?
                </h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Eine Einladungs-E-Mail wird versendet</li>
                  <li>• Der Link ist 7 Tage gültig</li>
                  <li>• Benutzer erhält die ausgewählten Rollen</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sende...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
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
                <ul className="list-disc ml-4">
                  {getSelectedRoleNames().map((role, index) => (
                    <li key={index}>{role}</li>
                  ))}
                </ul>
                <div className="text-sm mt-2 font-bold">
                  {evRole &&
                    ovRole &&
                    `Diese Person erhält umfassende Verwaltungsrechte für ${einsatzNamePlural} (erstellen, bearbeiten und löschen) sowie für deine Organisation.`}
                  {evRole &&
                    !ovRole &&
                    `Diese Person kann ${einsatzNamePlural} erstellen, bearbeiten und löschen.`}
                  {!evRole &&
                    ovRole &&
                    "Diese Person kann deine Organisation verwalten sowie Benutzer hinzufügen und entfernen."}
                </div>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button asChild variant={"outline"}>
              <AlertDialogCancel onClick={handleCancelConfirmation}>
                Abbrechen
              </AlertDialogCancel>
            </Button>
            <Button asChild variant={"destructive"}>
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
