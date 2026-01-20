'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSessionValidation } from '@/hooks/useSessionValidation';
import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';
import {
  getUserOrganizationByIdAction,
  updateOrganizationAction,
  uploadOrganizationLogoAction,
  removeOrganizationLogoAction,
  saveOrganizationDetailsAction,
} from '@/features/settings/organization-action';
import { getUserProfileAction } from '@/features/settings/settings-action';
import { getAllUserOrgRolesAction } from '@/features/settings/users-action';

import { UserProfileDialog } from '@/features/settings/components/UserProfileDialog';
import { InviteUserForm } from '@/features/invitations/components/InviteUserForm';
import { OrganizationSidebar } from '@/features/settings/components/manage/OrganizationSideBar';
import { OrganizationLogoSection } from '@/features/settings/components/manage/OrganizationLogo';
import { OrganizationDetailsForm } from '@/features/settings/components/manage/OrganizationDetailsForm';
import { OrganizationPreferences } from '@/features/settings/components/manage/OrganizationPreferences';
import { UsersManagementSection } from '@/features/settings/components/manage/UserManagement';
import { UserProperties } from '@/features/user_properties/components/UserProperties';
import { OrganizationAddresses } from '@/features/settings/components/manage/OrganizationAddresses';
import { OrganizationBankAccounts } from '@/features/settings/components/manage/OrganizationBankAccounts';
import { OrganizationDetails } from '@/features/settings/components/manage/OrganizationDetails';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';
import { queryKeys } from '@/features/organization/queryKeys';

export default function OrganizationManagePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgId = params?.orgId as string;
  const { data: session } = useSession();

  const [user, setUser] = useState<any>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [helperSingular, setHelperSingular] = useState('');
  const [helperPlural, setHelperPlural] = useState('');
  const [einsatzSingular, setEinsatzSingular] = useState('');
  const [einsatzPlural, setEinsatzPlural] = useState('');
  const [maxParticipantsPerHelper, setMaxParticipantsPerHelper] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  // Organization Details States
  const [website, setWebsite] = useState('');
  const [vat, setVat] = useState('');
  const [zvr, setZvr] = useState('');
  const [authority, setAuthority] = useState('');

  const staleTime = 5 * 60 * 1000;
  const gcTime = 10 * 60 * 1000;

  useSessionValidation({
    debug: false,
    onTokenExpired: () => {
      router.push('/signin');
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: settingsQueryKeys.userSettings(session?.user?.id || ''),
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
    queryKey: settingsQueryKeys.organization(orgId),
    enabled: !!orgId,
    queryFn: () => getUserOrganizationByIdAction(orgId || ''),
    staleTime,
    gcTime,
  });

  useEffect(() => {
    if (orgData) {
      setName(orgData.name ?? '');
      setDescription(orgData.description ?? '');
      setLogoUrl(orgData.logo_url ?? '');
      setEmail(orgData.email ?? '');
      setPhone(orgData.phone ?? '');
      setHelperSingular(orgData.helper_name_singular ?? 'Helfer:in');
      setHelperPlural(orgData.helper_name_plural ?? 'Helfer:innen');
      setMaxParticipantsPerHelper(
        orgData.max_participants_per_helper?.toString() ?? ''
      );
      setEinsatzSingular(orgData.einsatz_name_singular ?? 'Einsatz');
      setEinsatzPlural(orgData.einsatz_name_plural ?? 'Einsätze');
    }
  }, [orgData]);

  const { data: currentUserRoles } = useQuery({
    queryKey: settingsQueryKeys.userOrgRoles(session?.user?.id || '', orgId),
    enabled: !!orgId && !!session?.user?.id,
    queryFn: () => getAllUserOrgRolesAction(orgId),
    staleTime,
    gcTime,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: settingsQueryKeys.userOrganizations(orgId),
    enabled: !!orgId,
    queryFn: () => getAllUserOrgRolesAction(orgId),
    staleTime,
    gcTime,
  });
  const isSuperadmin =
    currentUserRoles?.some(
      (role) => role.role.name.toLowerCase() === 'superadmin'
    ) ?? false;
  const handleSignOut = async () => {
    const toastId = toast.loading('Wird abgemeldet...');
    try {
      await signOut({ callbackUrl: '/signin', redirect: true });
      queryClient.clear();
    } catch (error) {
      console.error('Fehler beim Abmelden:', error);
      toast.error('Fehler beim Abmelden', { id: toastId });
      router.push('/signin');
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Bitte eine gültige Bilddatei auswählen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei zu groß. Maximum 5MB.');
      return;
    }

    const toastId = toast.loading('Logo wird hochgeladen...');
    try {
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('orgId', orgId);
      const uploadRes = await uploadOrganizationLogoAction(formData);

      if (!uploadRes) throw new Error('Upload fehlgeschlagen');

      setLogoUrl(uploadRes.url);
      setLogoFile(null);

      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.organization(orgId),
      });

      toast.success('Logo erfolgreich hochgeladen!', { id: toastId });
    } catch (error) {
      toast.error('Fehler beim Hochladen', { id: toastId });
      console.error(error);
    }
  };

  const handleLogoRemove = async () => {
    const toastId = toast.loading('Logo wird entfernt...');
    try {
      await removeOrganizationLogoAction(orgId);

      setLogoUrl('');
      setLogoFile(null);

      const fileInput = document.getElementById(
        'logo-upload'
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.organization(orgId),
      });

      toast.success('Logo erfolgreich entfernt!', { id: toastId });
    } catch (error) {
      toast.error('Fehler beim Entfernen des Logos', { id: toastId });
      console.error(error);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      email?: string;
      phone?: string;
      helper_name_singular?: string;
      helper_name_plural?: string;
      einsatz_name_singular?: string;
      einsatz_name_plural?: string;
      max_participants_per_helper?: number;
      logoFile?: File | null;
      website?: string;
      vat?: string;
      zvr?: string;
      authority?: string;
    }) => {
      // Update Organization
      const updateData: any = {
        id: orgId,
        name: data.name,
        description: data.description,
        email: data.email,
        max_participants_per_helper: data.max_participants_per_helper,
        phone: data.phone,
        helper_name_singular: data.helper_name_singular,
        helper_name_plural: data.helper_name_plural,
        einsatz_name_singular: data.einsatz_name_singular,
        einsatz_name_plural: data.einsatz_name_plural,
      };

      const res = await updateOrganizationAction(updateData);
      if (!res) throw new Error('Fehler beim Speichern');

      // Update Organization Details
      await saveOrganizationDetailsAction({
        orgId,
        website: data.website,
        vat: data.vat,
        zvr: data.zvr,
        authority: data.authority,
      });

      return res;
    },
    onMutate: () => {
      return { toastId: toast.loading('Organisation wird gespeichert...') };
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.organization(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.orgDetails(orgId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations(session?.user?.orgIds || []),
      });
      setLogoFile(null);
      toast.success('Organisation erfolgreich aktualisiert!', {
        id: context.toastId,
      });
    },
    onError: (error, variables, context) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Fehler beim Speichern der Organisation',
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
      einsatz_name_singular: einsatzSingular,
      max_participants_per_helper: maxParticipantsPerHelper
        ? parseInt(maxParticipantsPerHelper)
        : undefined,
      einsatz_name_plural: einsatzPlural,
      logoFile: logoFile,
      website,
      vat,
      zvr,
      authority,
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
      toast.error('Fehler beim Laden der Organisation'),
      (<div className="p-6">Fehler beim Laden der Organisation</div>)
    );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col rounded-lg bg-white outline -outline-offset-1 outline-slate-200">
      <SettingsHeader
        onSave={handleSave}
        isSaving={updateMutation.isPending}
        onCancel={() => router.push('/')}
      />
      <div className="inline-flex items-start justify-start gap-4 self-stretch overflow-hidden py-4 pl-2">
        <OrganizationSidebar user={user} onSignOut={handleSignOut} />

        <div className="inline-flex flex-1 flex-col items-start justify-start gap-8">
          <div className="flex flex-col items-start justify-center gap-4 self-stretch">
            <div className="flex flex-col items-start justify-start gap-2 self-stretch">
              <div className="inline-flex items-center justify-start gap-2.5 self-stretch px-4 pt-2">
                <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
                  {name} verwalten
                </div>
              </div>
              <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
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
                  isSuperadmin={isSuperadmin}
                />
              </div>

              <OrganizationDetails
                organizationId={orgId}
                website={website}
                vat={vat}
                zvr={zvr}
                authority={authority}
                onWebsiteChange={setWebsite}
                onVatChange={setVat}
                onZvrChange={setZvr}
                onAuthorityChange={setAuthority}
                isSuperadmin={isSuperadmin}
              />
            </div>
          </div>

          <div className="flex flex-col items-start justify-center gap-4 self-stretch">
            <OrganizationPreferences
              helperSingular={helperSingular}
              helperPlural={helperPlural}
              onHelperSingularChange={setHelperSingular}
              onHelperPluralChange={setHelperPlural}
              einsatzSingular={einsatzSingular}
              einsatzPlural={einsatzPlural}
              onEinsatzSingularChange={setEinsatzSingular}
              onEinsatzPluralChange={setEinsatzPlural}
              maxParticipantsPerHelper={maxParticipantsPerHelper}
              onMaxParticipantsPerHelperChange={setMaxParticipantsPerHelper}
            />
          </div>
          <OrganizationAddresses
            organizationId={orgId}
            isSuperadmin={isSuperadmin}
          />

          <OrganizationBankAccounts
            organizationId={orgId}
            isSuperadmin={isSuperadmin}
          />
          <UserProperties organizationId={orgId} />

          <UsersManagementSection
            usersData={usersData || []}
            usersLoading={usersLoading}
            currentUserEmail={session?.user?.email || ''}
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
