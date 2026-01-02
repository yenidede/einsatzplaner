"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getUserProfileAction,
  updateUserRoleAction,
  removeUserFromOrganizationAction,
  getUserOrgRolesAction,
  promoteToSuperadminAction,
  demoteFromSuperadminAction,
} from "@/features/settings/users-action";
import { settingsQueryKeys } from "../queryKeys/queryKey";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import { UserProfileHeader } from "./UserProfile/UserProfileHeader";
import { UserContactInfo } from "./UserProfile/UserContactInfo";
import { UserPersonalProperties } from "./UserProfile/UserPersonalProperties";
import { UserRoleManagement } from "./UserProfile/UserRoleManagement";
import { UserDangerZone } from "./UserProfile/UserDangerZone";
import {
  getUserPropertiesAction,
  getUserPropertyValuesAction,
  upsertUserPropertyValueAction,
} from "@/features/user_properties/user_property-actions";
import type { UserPropertyWithField } from "@/features/user_properties/user_property-dal";

interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  organizationId: string;
  currentUserId?: string;
}

interface UserRole {
  id: string;
  role: {
    id: string;
    name: string;
    abbreviation: string;
  };
}

export function UserProfileDialog({
  isOpen,
  onClose,
  userId,
  organizationId,
  currentUserId,
}: UserProfileDialogProps) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [originalRoles, setOriginalRoles] = useState<string[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [propertyValues, setPropertyValues] = useState<Record<string, string>>(
    {}
  );
  const [originalPropertyValues, setOriginalPropertyValues] = useState<
    Record<string, string>
  >({});

  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const {
    data: userProfile,
    isLoading: profileLoading,
    error,
  } = useQuery({
    queryKey: settingsQueryKeys.userProfile(userId, organizationId),
    queryFn: async () => await getUserProfileAction(userId, organizationId),
    enabled: isOpen && !!userId && !!organizationId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: userOrgRoles = [] } = useQuery<UserRole[]>({
    queryKey: settingsQueryKeys.userOrgRoles(userId, organizationId),
    queryFn: async () => await getUserOrgRolesAction(organizationId, userId),
    enabled: isOpen && !!userId && !!organizationId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: currentUserOrgRoles = [] } = useQuery<UserRole[]>({
    queryKey: settingsQueryKeys.userOrgRoles(
      currentUserId || "",
      organizationId
    ),
    queryFn: async () =>
      await getUserOrgRolesAction(organizationId, currentUserId || ""),
    enabled: isOpen && !!currentUserId && !!organizationId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const isCurrentUserSuperadmin = currentUserOrgRoles.some(
    (userRole) =>
      userRole.role?.name === "Superadmin" ||
      userRole.role?.abbreviation === "SA"
  );

  const { data: userProperties = [] } = useQuery<UserPropertyWithField[]>({
    queryKey: ["userProperties", organizationId],
    queryFn: () => getUserPropertiesAction(organizationId),
    enabled: isOpen && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: userPropertyValues = [] } = useQuery({
    queryKey: ["userPropertyValues", userId, organizationId],
    queryFn: () => getUserPropertyValuesAction(userId, organizationId),
    enabled: isOpen && !!userId && !!organizationId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow || "";
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const rolesChanged =
      JSON.stringify([...userRoles].sort()) !==
      JSON.stringify([...originalRoles].sort());

    const propertyValuesChanged =
      Object.keys(propertyValues).some(
        (key) => propertyValues[key] !== originalPropertyValues[key]
      ) ||
      Object.keys(originalPropertyValues).some(
        (key) => propertyValues[key] !== originalPropertyValues[key]
      );

    setHasChanges(rolesChanged || propertyValuesChanged);
  }, [userRoles, originalRoles, propertyValues, originalPropertyValues]);

  useEffect(() => {
    if (userOrgRoles && userOrgRoles.length > 0) {
      const roles: string[] = [];
      userOrgRoles.forEach((userRole) => {
        const roleAbbr =
          userRole.role?.abbreviation || userRole.role?.name || "";
        if (
          roleAbbr === "OV" ||
          userRole.role?.name === "Organisationsverwaltung"
        ) {
          if (!roles.includes("OV")) roles.push("OV");
        } else if (
          roleAbbr === "EV" ||
          userRole.role?.name === "Einsatzverwaltung"
        ) {
          if (!roles.includes("EV")) roles.push("EV");
        } else if (
          roleAbbr === "Helfer" ||
          userRole.role?.name === "Helfer:in" ||
          userRole.role?.name === "Helfer"
        ) {
          if (!roles.includes("Helfer")) roles.push("Helfer");
        }
        if (
          userRole.role?.name === "Superadmin" ||
          userRole.role?.abbreviation === "SA"
        ) {
          if (!roles.includes("OV")) roles.push("OV");
          if (!roles.includes("EV")) roles.push("EV");
          if (!roles.includes("Helfer")) roles.push("Helfer");
        }
      });
      setUserRoles(roles);
      setOriginalRoles([...roles]);
      setHasKey(false);
    }
  }, [userOrgRoles]);

  useEffect(() => {
    if (userPropertyValues && userPropertyValues.length >= 0) {
      const values: Record<string, string> = {};
      userPropertyValues.forEach((pv) => {
        values[pv.user_property_id] = pv.value;
      });

      const currentValuesString = JSON.stringify(propertyValues);
      const newValuesString = JSON.stringify(values);

      if (currentValuesString !== newValuesString) {
        setPropertyValues(values);
        setOriginalPropertyValues(values);
      }
    }
  }, [userPropertyValues]);

  const getRoleColor = (role: any) => {
    const roleName = role.name || "";
    const roleAbbr = role.abbreviation || "";
    if (roleName === "Superadmin" || roleAbbr === "SA") return "bg-rose-400";
    if (roleName === "Organisationsverwaltung" || roleAbbr === "OV")
      return "bg-red-300";
    if (roleName === "Einsatzverwaltung" || roleAbbr === "EV")
      return "bg-orange-300";
    if (
      roleName === "Helfer:in" ||
      roleName === "Helfer" ||
      roleAbbr === "Helfer"
    )
      return "bg-cyan-200";
    return "bg-gray-300";
  };

  const getRoleDisplayName = (role: any) => {
    return role.name || role.abbreviation || "Unbekannt";
  };

  const isSuperadmin = userOrgRoles.some(
    (userRole) =>
      userRole.role?.name === "Superadmin" ||
      userRole.role?.abbreviation === "SA"
  );
  const isCurrentUserOV = currentUserOrgRoles.some(
    (userRole) =>
      userRole.role?.name === "Organisationsverwaltung" ||
      userRole.role?.abbreviation === "OV"
  );

  const isTargetUserOV = userOrgRoles.some(
    (userRole) =>
      userRole.role?.name === "Organisationsverwaltung" ||
      userRole.role?.abbreviation === "OV"
  );

  const saveChangesMutation = useMutation({
    mutationFn: async () => {
      const rolesToAdd: string[] = [];
      const rolesToRemove: string[] = [];
      userRoles.forEach((role) => {
        if (!originalRoles.includes(role)) rolesToAdd.push(role);
      });
      originalRoles.forEach((role) => {
        if (!userRoles.includes(role)) rolesToRemove.push(role);
      });
      const promises: Promise<any>[] = [];
      rolesToAdd.forEach((role) => {
        promises.push(
          updateUserRoleAction(userId, organizationId, role, "add")
        );
      });
      rolesToRemove.forEach((role) => {
        promises.push(
          updateUserRoleAction(userId, organizationId, role, "remove")
        );
      });
      await Promise.all(promises);
      return { rolesToAdd, rolesToRemove };
    },
    onMutate: () => {
      return { toastId: toast.loading("Profil wird gespeichert...") };
    },
    onSuccess: async (data, variables, context) => {
      setOriginalRoles([...userRoles]);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userProfile(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.allOrgRoles(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userOrgRoles(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.organizationUsers(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userOrganizations(organizationId),
        }),
      ]);

      toast.success("Rollen erfolgreich aktualisiert", {
        id: context.toastId,
      });
    },
    onError: async (error, variables, context) => {
      console.error("Error saving role changes:", error);
      setUserRoles([...originalRoles]);

      toast.error("Fehler beim Speichern der Rollenänderungen", {
        id: context?.toastId,
      });

      await showDialog({
        title: "Fehler",
        description: "Fehler beim Speichern der Rollenänderungen",
        confirmText: "OK",
        variant: "destructive",
      });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: () => removeUserFromOrganizationAction(userId, organizationId),
    onMutate: () => {
      return { toastId: toast.loading("Benutzer wird entfernt...") };
    },
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.organizationUsers(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userOrganizations(organizationId),
        }),
      ]);

      toast.success("Benutzer erfolgreich entfernt", {
        id: context.toastId,
      });
      onClose();
    },
    onError: (error, variables, context) => {
      toast.error("Fehler beim Entfernen des Benutzers", {
        id: context?.toastId,
      });
    },
  });

  const promoteToSuperadminMutation = useMutation({
    mutationFn: () => promoteToSuperadminAction(userId, organizationId),
    onMutate: () => {
      return { toastId: toast.loading("Wird zum Superadmin ernannt...") };
    },
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userProfile(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.allOrgRoles(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userOrgRoles(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.organizationUsers(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userOrganizations(organizationId),
        }),
      ]);

      toast.success("Erfolgreich zum Superadmin ernannt", {
        id: context.toastId,
      });
      onClose();
    },
    onError: async (error: Error, variables, context) => {
      toast.error(error.message || "Fehler beim Ernennen zum Superadmin", {
        id: context?.toastId,
      });

      await showDialog({
        title: "Fehler",
        description: error.message || "Fehler beim Ernennen zum Superadmin",
        confirmText: "OK",
        variant: "destructive",
      });
    },
  });

  const demoteFromSuperadminMutation = useMutation({
    mutationFn: () => demoteFromSuperadminAction(userId, organizationId),
    onMutate: () => {
      return { toastId: toast.loading("Superadmin-Rolle wird entfernt...") };
    },
    onSuccess: async (data, variables, context) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userProfile(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.allOrgRoles(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userOrgRoles(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.organizationUsers(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: settingsQueryKeys.userOrganizations(organizationId),
        }),
      ]);

      toast.success("Superadmin-Rolle erfolgreich entfernt", {
        id: context.toastId,
      });
      onClose();
    },
    onError: async (error: Error, variables, context) => {
      toast.error(
        error.message || "Fehler beim Entfernen der Superadmin-Rolle",
        {
          id: context?.toastId,
        }
      );

      await showDialog({
        title: "Fehler",
        description:
          error.message || "Fehler beim Entfernen der Superadmin-Rolle",
        confirmText: "OK",
        variant: "destructive",
      });
    },
  });

  const toggleRole = (roleAbbreviation: string) => {
    const isCurrentlyActive = userRoles.includes(roleAbbreviation);
    if (isCurrentlyActive) {
      setUserRoles((prev) => prev.filter((role) => role !== roleAbbreviation));
    } else {
      setUserRoles((prev) => [...prev, roleAbbreviation]);
    }
  };

  const handlePropertyValueChange = (propertyId: string, value: string) => {
    setPropertyValues((prev) => ({ ...prev, [propertyId]: value }));
  };

  const handleSaveAndClose = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await saveChangesMutation.mutateAsync();

      const promises: Promise<void>[] = [];
      for (const [propertyId, value] of Object.entries(propertyValues)) {
        if (value !== originalPropertyValues[propertyId]) {
          promises.push(
            upsertUserPropertyValueAction(userId, propertyId, value)
          );
        }
      }
      await Promise.all(promises);

      await queryClient.invalidateQueries({
        queryKey: ["userPropertyValues", userId, organizationId],
      });

      setOriginalPropertyValues({ ...propertyValues });
      setHasChanges(false);

      toast.success("Änderungen erfolgreich gespeichert!");
      onClose();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Fehler beim Speichern der Änderungen");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (hasChanges) {
      const result = await showDialog({
        title: "Ungespeicherte Änderungen",
        description:
          "Es gibt ungespeicherte Änderungen. Möchten Sie wirklich schließen?",
        confirmText: "Schließen",
        cancelText: "Abbrechen",
        variant: "destructive",
      });
      if (result === "success") {
        setUserRoles([...originalRoles]);
        setPropertyValues({ ...originalPropertyValues });
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleRemoveUser = async () => {
    const result = await showDialog({
      title: "Benutzer entfernen",
      description: `Möchten Sie ${userProfile?.firstname} ${userProfile?.lastname} wirklich aus der Organisation entfernen?`,
      confirmText: "Entfernen",
      cancelText: "Abbrechen",
      variant: "destructive",
    });
    if (result === "success") {
      removeUserMutation.mutate();
    }
  };

  const handlePromoteToSuperadmin = async () => {
    const result = await showDialog({
      title: "Zum Superadmin ernennen",
      description: `Möchten Sie ${userProfile?.firstname} ${userProfile?.lastname} wirklich zum Superadmin ernennen? Diese Person erhält dann alle Berechtigungen.`,
      confirmText: "Ernennen",
      cancelText: "Abbrechen",
    });
    if (result === "success") {
      promoteToSuperadminMutation.mutate();
    }
  };

  const handleDemoteFromSuperadmin = async () => {
    const result = await showDialog({
      title: "Superadmin-Rolle entfernen",
      description: `Möchten Sie ${userProfile?.firstname} ${userProfile?.lastname} wirklich die Superadmin-Rolle entziehen? Die Person behält alle anderen Rollen.`,
      confirmText: "Degradieren",
      cancelText: "Abbrechen",
      variant: "destructive",
    });
    if (result === "success") {
      demoteFromSuperadminMutation.mutate();
    }
  };

  if (!isOpen) return null;
  const isLoading = profileLoading;

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm" />
        <div className="relative bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">
              Lädt Benutzerdaten...
            </span>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-white/20 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-xl shadow-2xl p-8 border border-red-200">
          <div className="text-red-600 font-medium">
            Fehler beim Laden der Benutzerdaten
          </div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Schließen
          </button>
        </div>
      </div>,
      document.body
    );
  }

  if (!userProfile) return null;

  const content = (
    <>
      {AlertDialogComponent}
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-4"
        aria-modal="true"
        role="dialog"
      >
        <div
          className="fixed inset-0 bg-white/20 backdrop-blur-md transition-opacity"
          onClick={handleClose}
        />
        <div
          ref={dialogRef}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[90vw] lg:max-w-[900px] xl:max-w-[1024px] h-[90vh] relative bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] rounded-lg flex flex-col"
        >
          {/* Fixed Header with Buttons */}
          <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3 md:px-6 md:py-4">
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={handleClose}
                className="px-3 py-1.5 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors text-sm"
              >
                <span className="text-slate-800 font-medium font-['Inter']">
                  {hasChanges ? "Abbrechen" : "Schließen"}
                </span>
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={saving}
                className={`px-3 py-1.5 rounded-md flex justify-center items-center gap-2 disabled:opacity-50 transition-colors text-sm ${
                  hasChanges
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                <span className="text-white font-medium font-['Inter']">
                  {saving
                    ? "Speichert..."
                    : hasChanges
                    ? "Änderungen Speichern"
                    : "Schließen"}
                </span>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
              <div className="flex flex-col gap-6 md:gap-8">
                <UserProfileHeader
                  firstname={userProfile.firstname}
                  lastname={userProfile.lastname}
                  pictureUrl={userProfile.picture_url}
                  userOrgRoles={userOrgRoles}
                  getRoleColor={getRoleColor}
                  getRoleDisplayName={getRoleDisplayName}
                />
                <UserContactInfo
                  email={userProfile.email}
                  phone={userProfile.phone}
                />
                <UserPersonalProperties
                  organizationName={userProfile.organization?.name || ""}
                  hasKey={hasKey}
                  onToggleKey={() => setHasKey(!hasKey)}
                  description={userProfile.description}
                  userProperties={userProperties}
                  propertyValues={propertyValues}
                  onPropertyValueChange={handlePropertyValueChange}
                />
                <UserRoleManagement
                  organizationName={userProfile.organization?.name || ""}
                  userRoles={userRoles}
                  saving={saving}
                  onToggleRole={toggleRole}
                />
                <UserDangerZone
                  organizationName={userProfile.organization?.name || ""}
                  isSuperadmin={isSuperadmin}
                  isCurrentUserSuperadmin={isCurrentUserSuperadmin}
                  isCurrentUserOV={isCurrentUserOV}
                  isTargetUserOV={isTargetUserOV}
                  isRemovingUser={removeUserMutation.isPending}
                  isDemoting={demoteFromSuperadminMutation.isPending}
                  isPromoting={promoteToSuperadminMutation.isPending}
                  onRemoveUser={handleRemoveUser}
                  onDemoteFromSuperadmin={handleDemoteFromSuperadmin}
                  onPromoteToSuperadmin={handlePromoteToSuperadmin}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
