"use client";

import { useEffect, useId, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LogoutIcon from "@/components/icon/LogoutIcon";
import { Switch } from "@/features/settings/components/ui/switch";
import { Label } from "@/features/settings/components/ui/label";
import { LabelSettings } from "@/features/settings/components/ui/LabelSettings";
import { InputSettings } from "@/features/settings/components/ui/InputSettings";
import SettingsIcon from "@/components/icon/SettingsIcon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrganisationIcon from "@/features/settings/components/ui/OrganisationIcon";
import UploadProfilePictureIcon from "@/features/settings/components/ui/UploadProfilePictureIcon";
import ProfilePictureUpload from "@/features/settings/components/ProfilePictureUpload";
import OrganizationCard from "@/features/settings/components/OrganizationCard";
import CalendarSubscription from "@/features/calendar/components/CalendarSubscriptionClient";
import { useSessionValidation } from "@/hooks/useSessionValidation";
import { settingsQueryKeys } from "@/features/settings/queryKey";
import {
  getUserProfileAction,
  updateUserProfileAction,
  uploadProfilePictureAction,
  getSalutationsAction,
  updateOrgMailNotificationAction,
  UserUpdateData,
  removeUserFromOrganizationAction,
} from "@/features/settings/settings-action";
import { removeUserFromOrganization } from "@/DataAccessLayer/user";
import { toast } from "sonner";
import { useAlertDialog } from "@/hooks/use-alert-dialog";

type Organization = {
  id: string;
  name: string;
  helper_name_singular?: string;
  helper_name_plural?: string;
  hasGetMailNotification: boolean;
  roles: Array<{
    id: string;
    name: string;
    abbreviation: string | null;
  }>;
};

type Salutation = {
  id: string;
  salutation: string;
};

type UserSettings = {
  userId: string;
  firstname: string | null;
  lastname: string | null;
  email: string;
  picture_url: string | null;
  phone: string;
  salutationId: string | null;
  hasLogoinCalendar: boolean;
  hasGetMailNotification: boolean;
};

export default function SettingsPage() {
  const id = useId();
  const [showLogos, setShowLogos] = useState<boolean>(true);
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [firstname, setFirstname] = useState<string>("");
  const [lastname, setLastname] = useState<string>("");
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [salutationId, setSalutationId] = useState<string>("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null
  );
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  const queryClient = useQueryClient();

  useSessionValidation({
    debug: false,
    onTokenExpired: () => {
      console.log("Token abgelaufen - leite zu Login weiter");
      router.push("/signin");
    },
  });

  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: settingsQueryKeys.userSettings(session?.user?.id || ""),
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const res = await getUserProfileAction();
      if (!res) throw new Error("Fehler beim Laden");
      return res;
    },
  });

  const { data: salutations = [] } = useQuery({
    queryKey: settingsQueryKeys.salutation(),
    queryFn: async () => {
      const res = await getSalutationsAction();
      return res;
    },
  });

  useEffect(() => {
    if (userData) {
      setEmail(userData.email ?? "");
      setPhone(userData.phone ?? "");
      setFirstname(userData.firstname ?? "");
      setLastname(userData.lastname ?? "");
      setPictureUrl(userData.picture_url);
      setSalutationId(userData.salutationId);
      setShowLogos(userData.hasLogoinCalendar ?? true);

      if (userData.organizations && Array.isArray(userData.organizations)) {
        setOrganizations(userData.organizations);
      }
    }
  }, [userData]);

  const mutation = useMutation({
    mutationKey: settingsQueryKeys.userSettings(session?.user?.id || ""),
    mutationFn: async (newSettings: UserUpdateData) => {
      const res = await updateUserProfileAction(newSettings);
      if (!res) throw new Error("Fehler beim Speichern");
      return res;
    },
    onMutate: () => {
      return { toastId: toast.loading("Speichert...") };
    },
    onSuccess: (data, variables, context) => {
      toast.success("Einstellungen erfolgreich gespeichert!", {
        id: context.toastId,
      });
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.userSettings(session?.user?.id || ""),
      });
    },
    onError: (error, variables, context) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern der Einstellungen",
        { id: context?.toastId }
      );
    },
  });

  const leaveOrgMutation = useMutation({
    mutationFn: async ({
      userId,
      organizationId,
    }: {
      userId: string;
      organizationId: string;
    }) => {
      const res = await removeUserFromOrganizationAction(
        userId,
        organizationId
      );
      if (!res) throw new Error("Failed to leave organization");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.userSettings(session?.user?.id || ""),
      });
    },
  });

  const handleSave = async () => {
    if (!session?.user?.id) return;

    try {
      let finalPictureUrl = pictureUrl;

      // Upload profile picture if changed
      if (profilePictureFile) {
        const toastId = toast.loading("Profilbild wird hochgeladen...");
        try {
          const formData = new FormData();
          formData.append("file", profilePictureFile);
          const res = await uploadProfilePictureAction(formData);
          if (!res) {
            throw new Error(`Upload fehlgeschlagen`);
          }
          finalPictureUrl = res.picture_url;
          toast.success("Profilbild erfolgreich hochgeladen!", { id: toastId });
        } catch (error) {
          toast.error("Fehler beim Hochladen des Profilbilds", { id: toastId });
          throw error;
        }
      }

      // Update user profile
      await mutation.mutateAsync({
        id: session.user.id,
        email,
        firstname,
        lastname,
        phone,
        picture_url: finalPictureUrl || undefined,
        salutationId,
        hasLogoinCalendar: showLogos,
        hasGetMailNotification: true,
      });

      // Update organization mail notifications
      if (organizations.length > 0) {
        await Promise.all(
          organizations.map(async (org) => {
            await updateOrgMailNotificationAction(
              org.id,
              org.hasGetMailNotification ?? true
            );
          })
        );
      }

      // Update session
      if (session) {
        await update({
          user: {
            ...session.user,
            firstname,
            lastname,
            email,
            phone,
            picture_url: finalPictureUrl,
            hasLogoinCalendar: showLogos,
          },
        });

        setPictureUrl(finalPictureUrl);
      }

      await queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.userSettings(session?.user.id || ""),
      });
    } catch (error) {
      // Error toast wird bereits von mutation.onError behandelt
      console.error("Fehler beim Speichern:", error);
    }
  };

  const handleProfilePictureUpload = (file: File) => {
    setProfilePictureFile(file);
  };

  const handleRemoveProfilePicture = async () => {
    if (!session?.user?.id) return;

    setProfilePictureFile(null);
    const toastId = toast.loading("Profilbild wird entfernt...");

    try {
      await mutation.mutateAsync({
        id: session.user.id,
        firstname,
        lastname,
        email,
        picture_url: null,
        phone,
        salutationId,
        hasLogoinCalendar: showLogos,
        hasGetMailNotification: true,
      });

      await update({
        user: {
          ...session.user,
          picture_url: "",
        },
      });

      setPictureUrl(null);
      toast.success("Profilbild erfolgreich entfernt!", { id: toastId });
    } catch (error) {
      toast.error(
        `Fehler beim Entfernen des Profilbilds${
          error instanceof Error ? ": " + error.message : ""
        }`,
        { id: toastId }
      );
    }
  };

  async function handleOrganizationLeave(organizationId: string) {
    if (!session?.user?.id) return;

    const orgName =
      organizations.find((org) => org.id === organizationId)?.name ||
      "Organisation";

    const result = await showDialog({
      title: "Organisation verlassen",
      description: `Möchten Sie wirklich ${orgName} verlassen? Sie verlieren den Zugriff auf alle Daten dieser Organisation.`,
      confirmText: "Verlassen",
      cancelText: "Abbrechen",
      variant: "destructive",
    });

    if (result !== "success") return;

    const toastId = toast.loading("Organisation wird verlassen...");

    try {
      await leaveOrgMutation.mutateAsync({
        userId: session.user.id,
        organizationId,
      });
      toast.success(`${orgName} erfolgreich verlassen.`, { id: toastId });
    } catch (err) {
      toast.error(
        `Fehler beim Verlassen der Organisation.${
          err instanceof Error ? " " + err.message : ""
        }`,
        { id: toastId }
      );
    }
  }

  const hasManagePermission = (org: Organization): boolean => {
    if (!org.roles || !Array.isArray(org.roles)) return false;

    return org.roles.some((role) => {
      const roleName = role?.name?.toLowerCase() || "";
      const roleAbbr = role?.abbreviation?.toLowerCase() || "";

      return (
        roleName.includes("organisationsverwaltung") ||
        roleName.includes("superadmin") ||
        roleAbbr === "ov" ||
        roleName === "ov"
      );
    });
  };

  if (status === "unauthenticated") {
    signOut({ callbackUrl: "/signin" });
    return <div>Leite weiter…</div>;
  }

  if (isLoadingUser) {
    return <div>Lade Einstellungen…</div>;
  }

  if (!userData) {
    return <div>Keine Benutzerdaten gefunden.</div>;
  }

  const initials = `${firstname?.[0] || ""}${
    lastname?.[0] || ""
  }`.toUpperCase();

  const manageableOrganizations = organizations.filter(hasManagePermission);

  return (
    <>
      {AlertDialogComponent}
      <div className="w-full max-w-screen-xl mx-auto bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
        {/* Header */}
        <div className="w-full p-4 border-b border-slate-200 flex justify-between items-center gap-8">
          <div className="flex-1 h-8 flex justify-center items-center gap-2.5">
            <div className="flex-1 justify-start text-slate-800 text-2xl font-semibold font-['Poppins'] leading-loose">
              Einstellungen
            </div>
          </div>
          <div className="flex justify-end items-center gap-2">
            <button
              className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
              onClick={() => router.back()}
            >
              <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                Abbrechen (ESC)
              </div>
            </button>
            <button
              className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5"
              onClick={handleSave}
            >
              <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
                Speichern
              </div>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="self-stretch pl-2 py-4 inline-flex justify-start items-start gap-4 overflow-hidden">
          {/* Sidebar */}
          <div className="self-stretch inline-flex flex-col justify-between items-start">
            <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
              {/* Allgemein */}
              <div className="self-stretch px-2 py-1.5 bg-slate-100 rounded-md inline-flex justify-start items-center gap-2">
                <div className="w-4 h-4 relative overflow-hidden">
                  <SettingsIcon className="w-4 h-4 relative overflow-hidden" />
                </div>
                <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">
                  Allgemein
                </div>
              </div>

              <div className="self-stretch h-px bg-slate-200" />

              {/* Organisationsverwaltung */}
              <div className="justify-start text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">
                Organisationsverwaltung
              </div>

              {manageableOrganizations.length > 0 ? (
                manageableOrganizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() =>
                      router.push(`/organization/${org.id}/manage`)
                    }
                    className="w-full text-left px-2 py-1.5 bg-white hover:bg-slate-50 rounded-md inline-flex justify-start items-center gap-2 transition-colors"
                  >
                    <OrganisationIcon />
                    <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">
                      {org.name}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-gray-400">
                  Keine Berechtigung
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
              <button
                className="self-stretch px-4 py-2 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex justify-center items-center gap-2"
                onClick={() => signOut()}
              >
                <LogoutIcon className="w-4 h-4 relative overflow-hidden" />
                <span className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                  Ausloggen
                </span>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 inline-flex flex-col justify-start items-start gap-8">
            {/* Mein Account */}
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <div className="self-stretch flex flex-col justify-start items-start gap-2">
                <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
                  <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
                    Mein Account
                  </div>
                </div>

                <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
                  {/* Profile Picture */}{" "}
                  {/* TODO (Ömer): picture_url wirft langen url ab, funkt also nicht optimal -> verbessern */}
                  <div className="self-stretch px-4 flex flex-col justify-start items-start gap-2">
                    <div className="inline-flex justify-start items-center gap-2">
                      {profilePictureFile ? (
                        <img
                          src={URL.createObjectURL(profilePictureFile)}
                          alt="Profilbild Vorschau"
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                      ) : pictureUrl ? (
                        <img
                          src={pictureUrl}
                          alt="Profilbild"
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 px-2 py-1.5 bg-slate-200 rounded-[20px] inline-flex flex-col justify-center items-center gap-2.5">
                          <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">
                            {initials}
                          </div>
                        </div>
                      )}
                      <div className="inline-flex flex-col justify-center items-start">
                        <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-normal">
                          {firstname} {lastname}
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex justify-start items-start gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 bg-slate-900 text-white rounded-md inline-flex justify-center items-center gap-2"
                        onClick={() =>
                          (
                            document.querySelector(
                              "input[type=file]"
                            ) as HTMLInputElement | null
                          )?.click()
                        }
                      >
                        <UploadProfilePictureIcon />
                        <span>Profilbild hochladen</span>
                      </button>
                      <ProfilePictureUpload
                        onUpload={handleProfilePictureUpload}
                      />

                      <button
                        type="button"
                        className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
                        onClick={handleRemoveProfilePicture}
                      >
                        <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                          Profilbild entfernen
                        </div>
                      </button>
                    </div>
                  </div>
                  {/* Name Fields */}
                  <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                    <div className="grid w-full max-w-sm items-center gap-3">
                      <LabelSettings
                        htmlFor="firstname"
                        className="text-sm font-medium"
                      >
                        Vorname
                      </LabelSettings>
                      <InputSettings
                        id="firstname"
                        value={firstname}
                        className="w-full"
                        onChange={(e) => setFirstname(e.target.value)}
                      />
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-3">
                      <LabelSettings
                        htmlFor="lastname"
                        className="text-sm font-medium"
                      >
                        Nachname
                      </LabelSettings>
                      <InputSettings
                        id="lastname"
                        value={lastname}
                        className="w-full"
                        onChange={(e) => setLastname(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Contact Fields */}
                  <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                    <div className="grid w-full max-w-sm items-center gap-3">
                      <LabelSettings
                        htmlFor={id}
                        className="text-sm font-medium"
                      >
                        E-Mail
                      </LabelSettings>
                      <InputSettings
                        id={id}
                        value={email}
                        className="w-full"
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="grid w-full max-w-sm items-center gap-3">
                      <LabelSettings
                        htmlFor="phone"
                        className="text-sm font-medium"
                      >
                        Telefon
                      </LabelSettings>
                      <InputSettings
                        id="phone"
                        value={phone}
                        className="w-full"
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Persönliche Präferenzen */}
            <div className="self-stretch flex flex-col justify-center items-start">
              <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                <div className="flex-1 flex justify-start items-center gap-2">
                  <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
                    Persönliche Präferenzen
                  </div>
                </div>
              </div>

              {/* Logo Switch */}
              <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                <div className="flex-1 px-4 flex justify-start items-start gap-4">
                  <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
                      Zeige Logos in Kalenderansicht
                    </div>
                    <div className="inline-flex items-center gap-2">
                      <Switch
                        id="logo-switch"
                        checked={showLogos}
                        onCheckedChange={setShowLogos}
                        aria-label="Toggle switch"
                      />
                      <Label
                        htmlFor="logo-switch"
                        className="text-sm font-medium"
                      >
                        {showLogos ? "On" : "Off"}
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Salutation Select */}
              <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                <div className="flex-1 px-4 flex justify-start items-start gap-4">
                  <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                    <LabelSettings
                      htmlFor="salutation"
                      className="text-sm font-medium"
                    >
                      Anrede
                    </LabelSettings>
                    <select
                      id="salutation"
                      value={salutationId || ""}
                      onChange={(e) => setSalutationId(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-400 w-full"
                    >
                      <option value="">Bitte wählen</option>
                      {salutations.map((sal: Salutation) => (
                        <option key={sal.id} value={sal.id}>
                          {sal.salutation}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Benachrichtigungen */}
            <div className="self-stretch flex flex-col justify-center items-start">
              <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                <div className="flex-1 flex justify-start items-center gap-2">
                  <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
                    Benachrichtigungen
                  </div>
                </div>
              </div>

              <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                <div className="flex-1 px-4 flex flex-col gap-2">
                  {organizations.length > 0 ? (
                    organizations.map((org) => {
                      const isOn = org.hasGetMailNotification ?? true;

                      return (
                        <div
                          key={org.id}
                          className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5"
                        >
                          <Label
                            htmlFor={`org-switch-${org.id}`}
                            className="text-sm font-medium"
                          >
                            Emails von{" "}
                            <span className="font-bold">{org.name}</span>{" "}
                            erhalten
                          </Label>

                          <div className="inline-flex items-center gap-2">
                            <Switch
                              id={`org-switch-${org.id}`}
                              checked={isOn}
                              onCheckedChange={(checked) => {
                                setOrganizations((prev) =>
                                  prev.map((o) =>
                                    o.id === org.id
                                      ? {
                                          ...o,
                                          hasGetMailNotification: checked,
                                        }
                                      : o
                                  )
                                );
                              }}
                              aria-label={`Toggle switch for ${org.name}`}
                            />
                            <Label
                              htmlFor={`org-switch-${org.id}`}
                              className="text-sm font-medium"
                            >
                              {isOn ? "On" : "Off"}
                            </Label>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500">
                      Keine Organisationen für Benachrichtigungen.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Meine Organisationen */}
            <div className="self-stretch flex flex-col justify-center items-start">
              <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                <div className="flex-1 flex justify-start items-center gap-2">
                  <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
                    Meine Organisationen
                  </div>
                </div>
              </div>

              {organizations.length > 0 ? (
                organizations.map((org) => (
                  <div key={org.id}>
                    <OrganizationCard
                      name={org.name}
                      roles={org.roles || []}
                      onLeave={() => handleOrganizationLeave(org.id)}
                    />
                    <CalendarSubscription
                      orgId={org.id}
                      orgName={org.name}
                      variant="card"
                    />
                  </div>
                ))
              ) : (
                <div className="text-slate-500">
                  Du bist in keiner Organisation.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
