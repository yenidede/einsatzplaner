"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useSessionValidation } from "@/hooks/useSessionValidation";
import { organizationManageQueryKeys } from "@/features/settings/queryKeys/manage-QueryKeys";
import {
  getUserOrganizationByIdAction,
  updateOrganizationAction,
  uploadOrganizationLogoAction,
} from "@/features/settings/organization-action";
import { getUserProfileAction } from "@/features/settings/settings-action";
import { getAllUserOrgRolesAction } from "@/features/settings/users-action";

import { UserProfileDialog } from "@/features/settings/components/UserProfileDialog";
import { InviteUserForm } from "@/features/invitations/components/InviteUserForm";
import { OrganizationSidebar } from "@/features/settings/components/manage/OrganizationSideBar";
import { OrganizationLogoSection } from "@/features/settings/components/manage/OrganizationLogo";
import { OrganizationDetailsForm } from "@/features/settings/components/manage/OrganizationDetailsForm";
import { OrganizationPreferences } from "@/features/settings/components/manage/OrganizationPreferences";
import { UsersManagementSection } from "@/features/settings/components/manage/UserManagement";
import { UserProperties } from "@/features/user_properties/components/UserProperties";

export default function OrganizationManagePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = params?.orgId as string;
  const { data: session } = useSession();

  const [user, setUser] = useState<any>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [helperSingular, setHelperSingular] = useState("");
  const [helperPlural, setHelperPlural] = useState("");
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const staleTime = 5 * 60 * 1000;
  const gcTime = 10 * 60 * 1000;

  useSessionValidation({
    debug: false,
    onTokenExpired: () => {
      router.push("/signin");
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: organizationManageQueryKeys.userSettings(session?.user?.id || ""),
    enabled: !!session?.user?.id,
    queryFn: () => getUserProfileAction(),
    staleTime,
    gcTime,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data]);

  const {
    data: orgData,
    isLoading: orgLoading,
    error: orgError,
  } = useQuery({
    queryKey: organizationManageQueryKeys.organization(orgId),
    enabled: !!orgId,
    queryFn: () => getUserOrganizationByIdAction(orgId || ""),
    staleTime,
    gcTime,
  });

  useEffect(() => {
    if (orgData) {
      setName(orgData.name ?? "");
      setDescription(orgData.description ?? "");
      setLogoUrl(orgData.logo_url ?? "");
      setEmail(orgData.email ?? "");
      setPhone(orgData.phone ?? "");
      setHelperSingular(orgData.helper_name_singular ?? "Helfer:in");
      setHelperPlural(orgData.helper_name_plural ?? "Helfer:innen");
    }
  }, [orgData]);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: organizationManageQueryKeys.userOrganizations(orgId),
    enabled: !!orgId,
    queryFn: () => getAllUserOrgRolesAction(orgId),
    staleTime,
    gcTime,
  });

  const handleSignOut = async () => {
    const toastId = toast.loading("Wird abgemeldet...");
    try {
      await signOut({ callbackUrl: "/signin", redirect: true });
      queryClient.clear();
    } catch (error) {
      console.error("Fehler beim Abmelden:", error);
      toast.error("Fehler beim Abmelden", { id: toastId });
      router.push("/signin");
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Bitte eine gültige Bilddatei auswählen");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Datei zu groß. Maximum 5MB.");
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoRemove = () => {
    setLogoUrl("");
    setLogoFile(null);
    const fileInput = document.getElementById(
      "logo-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    toast.success("Logo entfernt");
  };

  const updateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      email?: string;
      phone?: string;
      helper_name_singular?: string;
      helper_name_plural?: string;
      logoFile?: File | null;
      removeLogo?: boolean;
    }) => {
      let finalLogoUrl = logoUrl;
      if (data.removeLogo) {
        finalLogoUrl = "";
      } else if (data.logoFile) {
        const formData = new FormData();
        formData.append("logo", data.logoFile);
        formData.append("orgId", orgId);
        const uploadRes = await uploadOrganizationLogoAction(formData);
        if (!uploadRes) throw new Error("Logo Upload fehlgeschlagen");
        finalLogoUrl = uploadRes.url;
      }
      const res = await updateOrganizationAction({
        id: orgId,
        name: data.name,
        description: data.description,
      });
      if (!res) throw new Error("Fehler beim Speichern");
      return res;
    },
    onMutate: () => {
      return { toastId: toast.loading("Organisation wird gespeichert...") };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: organizationManageQueryKeys.organization(orgId),
      });
      setLogoFile(null);
      toast.success("Organisation erfolgreich aktualisiert!", {
        id: context.toastId,
      });
    },
    onError: (error, variables, context) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Fehler beim Speichern der Organisation",
        { id: context?.toastId }
      );
      console.error(error);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name,
      description,
      email,
      phone,
      helper_name_singular: helperSingular,
      helper_name_plural: helperPlural,
      logoFile,
      removeLogo: false,
    });
  };

  const handleUserProfileClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    setIsProfileDialogOpen(false);
    setSelectedUserId(null);
  };

  if (isLoading || orgLoading)
    return <div className="p-6">Lädt Organisation...</div>;
  if (orgError)
    return (
      toast.error("Fehler beim Laden der Organisation"),
      (<div className="p-6">Fehler beim Laden der Organisation</div>)
    );

  return (
    <div className="w-full max-w-screen-xl mx-auto bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
      <div className="w-full p-4 border-b border-slate-200 flex justify-between items-center gap-8">
        <div className="flex-1 h-8 flex justify-center items-center gap-2.5">
          <div className="flex-1 justify-start text-slate-800 text-2xl font-semibold font-['Poppins'] leading-loose">
            Einstellungen
          </div>
        </div>
        <div className="flex justify-end items-center gap-2">
          <Link
            href="/settings"
            className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5 hover:bg-slate-50 transition-colors"
          >
            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
              Abbrechen (ESC)
            </div>
          </Link>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5 hover:bg-slate-800 transition-colors"
          >
            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
              Speichern
            </div>
          </button>
        </div>
      </div>

      <div className="self-stretch pl-2 py-4 inline-flex justify-start items-start gap-4 overflow-hidden">
        <OrganizationSidebar user={user} onSignOut={handleSignOut} />

        <div className="flex-1 inline-flex flex-col justify-start items-start gap-8">
          <div className="self-stretch flex flex-col justify-center items-start gap-4">
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
              <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
                <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
                  {name} verwalten
                </div>
              </div>
              <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
                <OrganizationLogoSection
                  name={name}
                  logoUrl={logoUrl}
                  onLogoUpload={handleLogoUpload}
                  onLogoRemove={handleLogoRemove}
                />
                <OrganizationDetailsForm
                  name={name}
                  email={email}
                  phone={phone}
                  description={description}
                  onNameChange={setName}
                  onEmailChange={setEmail}
                  onPhoneChange={setPhone}
                  onDescriptionChange={setDescription}
                />
              </div>
            </div>
          </div>

          <div className="self-stretch flex flex-col justify-center items-start gap-4">
            <OrganizationPreferences
              helperSingular={helperSingular}
              helperPlural={helperPlural}
              onHelperSingularChange={setHelperSingular}
              onHelperPluralChange={setHelperPlural}
            />
          </div>

          <UserProperties organizationId={orgId} />

          <UsersManagementSection
            usersData={usersData || []}
            usersLoading={usersLoading}
            currentUserEmail={session?.user?.email || ""}
            onUserProfileClick={handleUserProfileClick}
            onInviteClick={() => setIsInviteModalOpen(true)}
          />

          {selectedUserId && (
            <UserProfileDialog
              isOpen={isProfileDialogOpen}
              onClose={handleCloseProfileDialog}
              userId={selectedUserId}
              organizationId={orgId}
              currentUserId={session?.user?.id}
            />
          )}

          <InviteUserForm
            organizationId={orgId}
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
