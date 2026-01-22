'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useSessionValidation } from '@/hooks/useSessionValidation';
import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';
import {
  uploadOrganizationLogoAction,
  removeOrganizationLogoAction,
} from '@/features/settings/organization-action';
import {
  useUserProfile,
  useOrganizationById,
  useOrganizationUserRoles,
} from '@/features/settings/hooks/useUserProfile';
import { useUpdateOrganization } from '@/features/settings/hooks/useSettingsMutations';

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
  const [allowSelfSignOut, setAllowSelfSignOut] = useState(false);
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

  useSessionValidation({
    debug: false,
    onTokenExpired: () => {
      router.push('/signin');
    },
  });

  const { data, isLoading } = useUserProfile(session?.user?.id);

  useEffect(() => {
    if (data) setUser(data);
  }, [data]);

  const {
    data: orgData,
    isLoading: orgLoading,
    error: orgError,
  } = useOrganizationById(orgId);

  useEffect(() => {
    if (orgData) {
      setName(orgData.name ?? '');
      setDescription(orgData.description ?? '');
      setLogoUrl(orgData.logo_url ?? '');
      setEmail(orgData.email ?? '');
      setPhone(orgData.phone ?? '');
      setAllowSelfSignOut(orgData.allow_self_sign_out ?? false);
      setHelperSingular(orgData.helper_name_singular ?? 'Helfer:in');
      setHelperPlural(orgData.helper_name_plural ?? 'Helfer:innen');
      setMaxParticipantsPerHelper(
        orgData.max_participants_per_helper?.toString() ?? ''
      );
      setEinsatzSingular(orgData.einsatz_name_singular ?? 'Einsatz');
      setEinsatzPlural(orgData.einsatz_name_plural ?? 'Einsätze');
    }
  }, [orgData]);

  const { data: usersData, isLoading: usersLoading } =
    useOrganizationUserRoles(orgId);

  const { data: currentUserRoles } = useOrganizationUserRoles(orgId);

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
        queryKey: settingsQueryKeys.org.detail(orgId),
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
        queryKey: settingsQueryKeys.org.detail(orgId),
      });

      toast.success('Logo erfolgreich entfernt!', { id: toastId });
    } catch (error) {
      toast.error('Fehler beim Entfernen des Logos', { id: toastId });
      console.error(error);
    }
  };

  const updateMutation = useUpdateOrganization(orgId);

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
      allow_self_sign_out: allowSelfSignOut,
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
      <div className="inline-flex max-h-[calc(100vh-8rem)] items-start justify-start gap-4 self-stretch overflow-y-auto py-4 pl-2">
        <OrganizationSidebar user={user} onSignOut={handleSignOut} />

        <div className="inline-flex flex-1 flex-col items-start justify-start gap-8 overflow-y-auto">
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
                  allowSelfSignOut={allowSelfSignOut}
                  onNameChange={setName}
                  onEmailChange={setEmail}
                  onPhoneChange={setPhone}
                  onDescriptionChange={setDescription}
                  onAllowSelfSignOutChange={setAllowSelfSignOut}
                  isSuperadmin={isSuperadmin}
                  onSave={handleSave}
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
                onSave={handleSave}
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
              onSave={handleSave}
            />
          </div>
          <OrganizationAddresses
            organizationId={orgId}
            isSuperadmin={isSuperadmin}
            onSave={handleSave}
          />

          <OrganizationBankAccounts
            organizationId={orgId}
            isSuperadmin={isSuperadmin}
            onSave={handleSave}
          />
          <UserProperties organizationId={orgId} onSave={handleSave} />

          <UsersManagementSection
            usersData={usersData || []}
            usersLoading={usersLoading}
            currentUserEmail={session?.user?.email || ''}
            onUserProfileClick={handleUserProfileClick}
            onInviteClick={() => setIsInviteModalOpen(true)}
            onSave={handleSave}
          />

          {selectedUserId && (
            <UserProfileDialog
              isOpen={isProfileDialogOpen}
              onClose={handleCloseProfileDialog}
              userId={selectedUserId}
              organizationId={orgId}
              currentUserId={session?.user?.id}
              onSave={handleSave}
            />
          )}

          <InviteUserForm
            organizationId={orgId}
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
}
