"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserProfileAction,
  updateUserRoleAction,
  removeUserFromOrganizationAction,
  getUserOrgRolesAction,
  promoteToSuperadminAction,
  demoteFromSuperadminAction,
} from "@/features/settings/users-action";
import {
  userProfileQueryKeys,
  organizationUsersQueryKeys,
} from "../queryKeys/userProfile-QueryKeys";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import { UserProfileHeader } from "./UserProfile/UserProfileHeader";
import { UserContactInfo } from "./UserProfile/UserContactInfo";
import { UserPersonalProperties } from "./UserProfile/UserPersonalProperties";
import { UserRoleManagement } from "./UserProfile/UserRoleManagement";
import { UserDangerZone } from "./UserProfile/UserDangerZone";

interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  organizationId: string;
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
}: UserProfileDialogProps) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [originalRoles, setOriginalRoles] = useState<string[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const { showDialog, AlertDialogComponent } = useAlertDialog();

  // Queries
  const {
    data: userProfile,
    isLoading: profileLoading,
    error,
  } = useQuery({
    queryKey: userProfileQueryKeys.profile(userId, organizationId),
    queryFn: async () => await getUserProfileAction(userId, organizationId),
    enabled: isOpen && !!userId && !!organizationId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const { data: userOrgRoles = [] } = useQuery<UserRole[]>({
    queryKey: userProfileQueryKeys.orgRoles(userId, organizationId),
    queryFn: async () => await getUserOrgRolesAction(organizationId, userId),
    enabled: isOpen && !!userId && !!organizationId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Effects
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const preventTouch = (e: Event) => e.preventDefault();
    document.addEventListener("touchmove", preventTouch, { passive: false });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow || "";
      document.removeEventListener("touchmove", preventTouch);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const rolesChanged =
      JSON.stringify(userRoles.sort()) !== JSON.stringify(originalRoles.sort());
    setHasChanges(rolesChanged);
  }, [userRoles, originalRoles]);

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
      setHasChanges(false);
    }
  }, [userOrgRoles]);

  // Helper functions
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

  // Mutations
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
    onSuccess: () => {
      setOriginalRoles([...userRoles]);
      setHasChanges(false);
      queryClient.invalidateQueries({
        queryKey: userProfileQueryKeys.profile(userId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: userProfileQueryKeys.allOrgRoles(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: userProfileQueryKeys.orgRoles(userId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationUsersQueryKeys.byOrg(organizationId),
      });
    },
    onError: async (error) => {
      console.error("Error saving role changes:", error);
      setUserRoles([...originalRoles]);
      setHasChanges(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: organizationUsersQueryKeys.byOrg(organizationId),
      });
      onClose();
    },
  });

  const promoteToSuperadminMutation = useMutation({
    mutationFn: () => promoteToSuperadminAction(userId, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userProfileQueryKeys.profile(userId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: userProfileQueryKeys.allOrgRoles(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: userProfileQueryKeys.orgRoles(userId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: organizationUsersQueryKeys.byOrg(organizationId),
      });
      onClose();
    },
    onError: async (error: Error) => {
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: userProfileQueryKeys.profile(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: userProfileQueryKeys.allOrgRoles(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: userProfileQueryKeys.orgRoles(userId, organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: organizationUsersQueryKeys.byOrg(organizationId),
        }),
      ]);
      onClose();
    },
    onError: async (error: Error) => {
      await showDialog({
        title: "Fehler",
        description:
          error.message || "Fehler beim Entfernen der Superadmin-Rolle",
        confirmText: "OK",
        variant: "destructive",
      });
    },
  });

  // Event handlers
  const toggleRole = (roleAbbreviation: string) => {
    const isCurrentlyActive = userRoles.includes(roleAbbreviation);
    if (isCurrentlyActive) {
      setUserRoles((prev) => prev.filter((role) => role !== roleAbbreviation));
    } else {
      setUserRoles((prev) => [...prev, roleAbbreviation]);
    }
  };

  const handleSaveAndClose = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await saveChangesMutation.mutateAsync();
      onClose();
    } catch (error) {
      // Error is handled in mutation
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

  // Early returns
  if (!isOpen) return null;
  const isLoading = profileLoading;

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-40 flex items-center justify-center">
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
      <div className="fixed inset-0 z-40 flex items-center justify-center">
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
        className="fixed inset-0 z-40 flex items-center justify-center"
        aria-modal="true"
        role="dialog"
      >
        <div
          className="fixed inset-0 bg-white/20 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />
        <div
          ref={dialogRef}
          onClick={(e) => e.stopPropagation()}
          className="w-[656px] h-[1024px] px-4 relative bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] inline-flex justify-start items-center gap-2.5 rounded-lg overflow-hidden"
        >
          <div className="flex-1 h-[740px] flex justify-start items-start gap-2 overflow-y-auto">
            <div className="flex-1 inline-flex flex-col justify-start items-start gap-8">
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
                isRemovingUser={removeUserMutation.isPending}
                isDemoting={demoteFromSuperadminMutation.isPending}
                isPromoting={promoteToSuperadminMutation.isPending}
                onRemoveUser={handleRemoveUser}
                onDemoteFromSuperadmin={handleDemoteFromSuperadmin}
                onPromoteToSuperadmin={handlePromoteToSuperadmin}
              />
            </div>
          </div>
          <div className="w-[592px] left-[32px] top-[28px] absolute flex justify-end items-center gap-10">
            <div className="flex justify-end items-center gap-2">
              <button
                onClick={handleClose}
                className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5 hover:bg-gray-50 transition-colors"
              >
                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-normal">
                  {hasChanges ? "Abbrechen (ESC)" : "Schließen (ESC)"}
                </div>
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={saving}
                className={`px-3 py-1 rounded-md flex justify-center items-center gap-2.5 disabled:opacity-50 transition-colors ${
                  hasChanges
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
                  {saving
                    ? "Speichert..."
                    : hasChanges
                    ? "Änderungen Speichern"
                    : "Schließen"}
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
