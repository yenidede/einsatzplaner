'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
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

import { UserProfileDialog } from '@/components/settings/UserProfileDialog';
import { InviteUserForm } from '@/features/invitations/components/InviteUserForm';
import { OrganizationLogoSection } from '@/components/settings/org/OrganizationLogo';
import { OrganizationDetailsForm } from '@/components/settings/org/OrganizationDetailsForm';
import { OrganizationPreferences } from '@/components/settings/org/OrganizationPreferences';
import { UsersManagementSection } from '@/components/settings/org/UserManagement';
import { UserProperties } from '@/features/user_properties/components/UserProperties';
import { OrganizationAddresses } from '@/components/settings/org/OrganizationAddresses';
import { OrganizationBankAccounts } from '@/components/settings/org/OrganizationBankAccounts';
import { OrganizationDetails } from '@/components/settings/org/OrganizationDetails';
import { PageHeader } from '@/components/settings/PageHeader';
import {
  ORG_MANAGE_NAV_ITEMS,
  type OrgManageSectionId,
} from '@/components/settings/org-manage-constants';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { OrgSettingsMobileNav } from '@/components/settings/OrgSettingsMobileNav';
import { SettingsLoadingSkeleton } from '@/components/settings/SettingsLoadingSkeleton';
import { SettingsErrorCard } from '@/components/settings/SettingsErrorCard';
import { useSectionNavigation } from '@/components/settings/hooks/useSectionNavigation';
import { useSettingsKeyboardShortcuts } from '@/components/settings/hooks/useSettingsKeyboardShortcuts';
import { useSettingsSessionValidation } from '@/components/settings/hooks/useSettingsSessionValidation';
import { useUnsavedChanges } from '@/components/settings/hooks/useUnsavedChanges';
import { useAlertDialog } from '@/contexts/AlertDialogContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function OrganizationManagePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const orgId = params?.orgId as string;
  const { data: session } = useSession();

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

  // Initial values for change detection
  const initialValuesRef = useRef<{
    name: string;
    email: string;
    phone: string;
    description: string;
    allowSelfSignOut: boolean;
    helperSingular: string;
    helperPlural: string;
    einsatzSingular: string;
    einsatzPlural: string;
    maxParticipantsPerHelper: string;
    website: string;
    vat: string;
    zvr: string;
    authority: string;
  } | null>(null);

  // Use shared session validation hook
  useSettingsSessionValidation();

  const { data: userData, isLoading: isLoadingUser } = useUserProfile(
    session?.user?.id
  );

  const {
    data: orgData,
    isLoading: orgLoading,
    error: orgError,
  } = useOrganizationById(orgId);

  // Use shared section navigation hook
  const {
    activeSection,
    sectionRefs,
    handleSectionChange: originalHandleSectionChange,
  } = useSectionNavigation<OrgManageSectionId>({
    sectionId: 'details',
    navItems: ORG_MANAGE_NAV_ITEMS,
    defaultSection: 'details',
    basePath: `/settings/org/${orgId}`,
    shouldSetDefault: !!orgData,
  });

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

      // Update initial values whenever orgData changes (including after save/refetch)
      initialValuesRef.current = {
        name: orgData.name ?? '',
        email: orgData.email ?? '',
        phone: orgData.phone ?? '',
        description: orgData.description ?? '',
        allowSelfSignOut: orgData.allow_self_sign_out ?? false,
        helperSingular: orgData.helper_name_singular ?? 'Helfer:in',
        helperPlural: orgData.helper_name_plural ?? 'Helfer:innen',
        einsatzSingular: orgData.einsatz_name_singular ?? 'Einsatz',
        einsatzPlural: orgData.einsatz_name_plural ?? 'Einsätze',
        maxParticipantsPerHelper:
          orgData.max_participants_per_helper?.toString() ?? '',
        website: orgData.website ?? '',
        vat: orgData.vat ?? '',
        zvr: orgData.zvr ?? '',
        authority: orgData.authority ?? '',
      };
      // Clear logo file when data is refreshed
      setLogoFile(null);
    }
  }, [orgData]);

  const { data: usersData, isLoading: usersLoading } =
    useOrganizationUserRoles(orgId);

  const { data: currentUserRoles } = useOrganizationUserRoles(orgId);

  const isSuperadmin =
    currentUserRoles?.some(
      (role) => role.role.name.toLowerCase() === 'superadmin'
    ) ?? false;

  const updateMutation = useUpdateOrganization(orgId);

  // Check for unsaved changes
  const hasUnsavedChanges = (() => {
    if (!initialValuesRef.current) return false;
    const initial = initialValuesRef.current;

    return (
      name !== initial.name ||
      email !== initial.email ||
      phone !== initial.phone ||
      description !== initial.description ||
      allowSelfSignOut !== initial.allowSelfSignOut ||
      helperSingular !== initial.helperSingular ||
      helperPlural !== initial.helperPlural ||
      einsatzSingular !== initial.einsatzSingular ||
      einsatzPlural !== initial.einsatzPlural ||
      maxParticipantsPerHelper !== initial.maxParticipantsPerHelper ||
      website !== initial.website ||
      vat !== initial.vat ||
      zvr !== initial.zvr ||
      authority !== initial.authority ||
      logoFile !== null
    );
  })();

  const handleSave = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({
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

      // Note: Initial values will be updated automatically when orgData refetches
      // But we also update them here immediately to prevent false positives
      if (initialValuesRef.current) {
        initialValuesRef.current = {
          name,
          email,
          phone,
          description,
          allowSelfSignOut,
          helperSingular,
          helperPlural,
          einsatzSingular,
          einsatzPlural,
          maxParticipantsPerHelper,
          website,
          vat,
          zvr,
          authority,
        };
      }
      setLogoFile(null);
    } catch (error) {
      // Error handling is done by the mutation
    }
  }, [
    name,
    description,
    email,
    phone,
    helperSingular,
    helperPlural,
    einsatzSingular,
    einsatzPlural,
    maxParticipantsPerHelper,
    logoFile,
    website,
    vat,
    zvr,
    authority,
    allowSelfSignOut,
    updateMutation,
  ]);

  // Use unsaved changes hook
  const { handleSectionChangeWithCheck, navigateWithCheck } = useUnsavedChanges(
    {
      hasUnsavedChanges,
      onSave: handleSave,
      onSectionChange: originalHandleSectionChange,
    }
  );

  // Wrapper for section change that checks for unsaved changes
  const handleSectionChange = useCallback(
    (section: OrgManageSectionId) => {
      handleSectionChangeWithCheck(section);
    },
    [handleSectionChangeWithCheck]
  );

  // Use shared keyboard shortcuts hook
  useSettingsKeyboardShortcuts({
    onSave: handleSave,
  });

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

  const handleUserProfileClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    setIsProfileDialogOpen(false);
    setSelectedUserId(null);
  };

  if (isLoadingUser || orgLoading) {
    return <SettingsLoadingSkeleton sidebarItems={6} />;
  }

  if (orgError || !orgData) {
    return (
      <SettingsErrorCard
        title="Fehler"
        description={
          orgError
            ? 'Fehler beim Laden der Organisation'
            : 'Organisation nicht gefunden'
        }
        error={orgError || undefined}
      />
    );
  }

  const header = (
    <PageHeader
      title={`${name} verwalten`}
      description="Verwalte die Einstellungen und Details deiner Organisation"
      onSave={handleSave}
      isSaving={updateMutation.isPending}
      onCancel={() => router.push('/')}
    />
  );

  const mobileNav = (
    <OrgSettingsMobileNav
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    />
  );

  return (
    <>
      <SettingsPageLayout
        header={header}
        mobileNav={mobileNav}
        currentOrgId={orgId}
        activeOrgSection={activeSection}
        onOrgSectionChange={handleSectionChange}
        onNavigate={navigateWithCheck}
      >
        {/* Details Section */}
        <section
          id="details"
          ref={(el) => {
            sectionRefs.current.details = el;
          }}
          aria-labelledby="details-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="details-heading">Organisationsdetails</CardTitle>
              <CardDescription>
                Grundlegende Informationen und Logo deiner Organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <OrganizationLogoSection
                name={name}
                logoUrl={logoUrl}
                onLogoUpload={handleLogoUpload}
                onLogoRemove={handleLogoRemove}
              />
              <Separator />
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
              <Separator />
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
            </CardContent>
          </Card>
        </section>

        {/* Preferences Section */}
        <section
          id="preferences"
          ref={(el) => {
            sectionRefs.current.preferences = el;
          }}
          aria-labelledby="preferences-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="preferences-heading">Einstellungen</CardTitle>
              <CardDescription>
                Passe die Terminologie und Präferenzen deiner Organisation an
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </section>

        {/* Addresses Section */}
        <section
          id="addresses"
          ref={(el) => {
            sectionRefs.current.addresses = el;
          }}
          aria-labelledby="addresses-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="addresses-heading">Adressen</CardTitle>
              <CardDescription>
                Verwalte die Adressen deiner Organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationAddresses
                organizationId={orgId}
                isSuperadmin={isSuperadmin}
                onSave={handleSave}
              />
            </CardContent>
          </Card>
        </section>

        {/* Bank Accounts Section */}
        <section
          id="bank-accounts"
          ref={(el) => {
            sectionRefs.current['bank-accounts'] = el;
          }}
          aria-labelledby="bank-accounts-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="bank-accounts-heading">Bankkonten</CardTitle>
              <CardDescription>
                Verwalte die Bankkonten deiner Organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationBankAccounts
                organizationId={orgId}
                isSuperadmin={isSuperadmin}
                onSave={handleSave}
              />
            </CardContent>
          </Card>
        </section>

        {/* User Properties Section */}
        <section
          id="user-properties"
          ref={(el) => {
            sectionRefs.current['user-properties'] = el;
          }}
          aria-labelledby="user-properties-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="user-properties-heading">
                Benutzereigenschaften
              </CardTitle>
              <CardDescription>
                Verwalte die benutzerdefinierten Eigenschaften für Benutzer in
                dieser Organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserProperties organizationId={orgId} onSave={handleSave} />
            </CardContent>
          </Card>
        </section>

        {/* Users Section */}
        <section
          id="users"
          ref={(el) => {
            sectionRefs.current.users = el;
          }}
          aria-labelledby="users-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="users-heading">Benutzer</CardTitle>
              <CardDescription>
                Verwalte Benutzer und ihre Rollen in dieser Organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsersManagementSection
                usersData={usersData || []}
                usersLoading={usersLoading}
                currentUserEmail={session?.user?.email || ''}
                onUserProfileClick={handleUserProfileClick}
                onInviteClick={() => setIsInviteModalOpen(true)}
                onSave={handleSave}
              />
            </CardContent>
          </Card>
        </section>

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
      </SettingsPageLayout>
    </>
  );
}
