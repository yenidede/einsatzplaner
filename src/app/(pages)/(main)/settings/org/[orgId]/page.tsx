'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';
import {
  uploadOrganizationLogoAction,
  removeOrganizationLogoAction,
  uploadOrganizationSmallLogoAction,
  removeOrganizationSmallLogoAction,
} from '@/features/settings/organization-action';
import {
  useUserProfile,
  useOrganizationById,
  useOrganizationUserRoles,
} from '@/features/settings/hooks/useUserProfile';
import { useUpdateOrganization } from '@/features/settings/hooks/useSettingsMutations';

import { UserProfileDialog } from '@/components/settings/UserProfileDialog';
import { InviteUserForm } from '@/features/invitations/components/InviteUserForm';
import { FileUpload, PreviewAspectRatio } from '@/components/form/file-upload';
import { OrganizationDetailsForm } from '@/components/settings/org/OrganizationDetailsForm';
import { OrganizationPreferences } from '@/components/settings/org/OrganizationPreferences';
import { UsersManagementSection } from '@/components/settings/org/UserManagement';
import { UserProperties } from '@/features/user_properties/components/UserProperties';
import { TemplatesOverviewSection } from '@/components/template/TemplatesOverviewSection';
import { OrganizationPdfExportForm } from '@/components/settings/org/OrganizationPdfExportForm';
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
import { useOrganizationDetails } from '@/features/organization/hooks/use-organization-queries';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { usePermissionGuard } from '@/hooks/use-permission-guard';

export default function OrganizationManagePage() {
  const params = useParams();
  const router = useRouter();
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
  const [smallLogoUrl, setSmallLogoUrl] = useState<string>('');
  const [smallLogoFile, setSmallLogoFile] = useState<File | null>(null);
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

  const { isLoading: isLoadingUser } = useUserProfile(session?.user?.id);
  const { isAuthorized, isLoading: isLoadingPermission } = usePermissionGuard({
    requiredPermissions: ['organization:update'],
    requireAll: false,
  });
  const {
    data: orgData,
    isLoading: orgLoading,
    error: orgError,
  } = useOrganizationById(orgId);

  // Load organization details separately (website, vat, zvr, authority)
  const { data: orgDetails } = useOrganizationDetails(orgId);

  // Use shared section navigation hook
  const {
    activeSection,
    sectionRefs,
    handleSectionChange: originalHandleSectionChange,
  } = useSectionNavigation<OrgManageSectionId>({
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
      setSmallLogoUrl(orgData.small_logo_url ?? '');
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
        website: '', // Loaded separately via useOrganizationDetails
        vat: '', // Loaded separately via useOrganizationDetails
        zvr: '', // Loaded separately via useOrganizationDetails
        authority: '', // Loaded separately via useOrganizationDetails
      };
      // Clear logo files when data is refreshed
      setLogoFile(null);
      setSmallLogoFile(null);
    }
  }, [orgData]);

  // Update initial values when organization details load
  useEffect(() => {
    if (!orgDetails) return;

    // Ensure initialValuesRef is initialized even if orgDetails resolves first.
    if (!initialValuesRef.current) {
      initialValuesRef.current = {
        name: orgData?.name ?? '',
        email: orgData?.email ?? '',
        phone: orgData?.phone ?? '',
        description: orgData?.description ?? '',
        allowSelfSignOut: orgData?.allow_self_sign_out ?? false,
        helperSingular: orgData?.helper_name_singular ?? 'Helfer:in',
        helperPlural: orgData?.helper_name_plural ?? 'Helfer:innen',
        einsatzSingular: orgData?.einsatz_name_singular ?? 'Einsatz',
        einsatzPlural: orgData?.einsatz_name_plural ?? 'Einsätze',
        maxParticipantsPerHelper:
          orgData?.max_participants_per_helper?.toString() ?? '',
        website: '',
        vat: '',
        zvr: '',
        authority: '',
      };
    }

    initialValuesRef.current = {
      ...initialValuesRef.current,
      website: orgDetails.website ?? '',
      vat: orgDetails.vat ?? '',
      zvr: orgDetails.zvr ?? '',
      authority: orgDetails.authority ?? '',
    };

    // Also update the state
    setWebsite(orgDetails.website ?? '');
    setVat(orgDetails.vat ?? '');
    setZvr(orgDetails.zvr ?? '');
    setAuthority(orgDetails.authority ?? '');
  }, [orgDetails, orgData]);

  const { data: currentUserWithRoles } = useOrganizationUserRoles(orgId);

  const isSuperadmin =
    currentUserWithRoles?.some(
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
      logoFile !== null ||
      smallLogoFile !== null
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
      setSmallLogoFile(null);
    } catch {
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
  const { handleSectionChangeWithCheck, navigateWithCheck } =
    useUnsavedChanges<OrgManageSectionId>({
      hasUnsavedChanges,
      onSectionChange: originalHandleSectionChange,
    });

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

  const handleLogoUpload = async (file: File): Promise<string> => {
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
      return uploadRes.url;
    } catch (error) {
      toast.error('Fehler beim Hochladen', { id: toastId });
      console.error(error);
      throw error;
    }
  };

  const handleLogoRemove = async () => {
    const toastId = toast.loading('Logo wird entfernt...');
    try {
      await removeOrganizationLogoAction(orgId);

      setLogoUrl('');
      setLogoFile(null);

      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.org.detail(orgId),
      });

      toast.success('Logo erfolgreich entfernt!', { id: toastId });
    } catch (error) {
      toast.error('Fehler beim Entfernen des Logos', { id: toastId });
      console.error(error);
    }
  };

  const handleSmallLogoUpload = async (file: File): Promise<string> => {
    const toastId = toast.loading('Kleines Logo wird hochgeladen...');
    try {
      const formData = new FormData();
      formData.append('smallLogo', file);
      formData.append('orgId', orgId);
      const uploadRes = await uploadOrganizationSmallLogoAction(formData);

      if (!uploadRes) throw new Error('Upload fehlgeschlagen');

      setSmallLogoUrl(uploadRes.url);
      setSmallLogoFile(null);

      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.org.detail(orgId),
      });

      toast.success('Kleines Logo erfolgreich hochgeladen!', { id: toastId });
      return uploadRes.url;
    } catch (error) {
      toast.error('Fehler beim Hochladen', { id: toastId });
      console.error(error);
      throw error;
    }
  };

  const handleSmallLogoRemove = async () => {
    const toastId = toast.loading('Kleines Logo wird entfernt...');
    try {
      await removeOrganizationSmallLogoAction(orgId);

      setSmallLogoUrl('');
      setSmallLogoFile(null);

      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.org.detail(orgId),
      });

      toast.success('Kleines Logo erfolgreich entfernt!', { id: toastId });
    } catch (error) {
      toast.error('Fehler beim Entfernen des kleinen Logos', { id: toastId });
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

  if (isLoadingPermission) {
    return <div>Lade Nutzerdaten...</div>;
  }

  if (!isAuthorized) {
    return <div>Keine Berechtigung. Weiterleitung...</div>;
  }
  if (isLoadingUser || orgLoading) {
    return <SettingsLoadingSkeleton sidebarItems={7} />;
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
      description="Verwalten Sie die Einstellungen und Details Ihrer Organisation"
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
        key={orgId}
        header={header}
        mobileNav={mobileNav}
        currentOrgId={orgId}
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
                Grundlegende Informationen und Logo Ihrer Organisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logo</label>
                  <p className="text-muted-foreground text-sm">
                    Das Hauptlogo Ihrer Organisation wird in verschiedenen
                    Bereichen angezeigt.
                  </p>
                  <FileUpload
                    id="logo-upload"
                    name="logo"
                    maxFiles={1}
                    accept="image/png, image/jpeg, image/gif, image/jpg, image/svg+xml, .svg"
                    placeholder="PNG, JPEG, GIF oder SVG (wird automatisch komprimiert). Sollte das Logo nicht richtig laden, bitte die Seite neu laden."
                    previewAspectRatio={PreviewAspectRatio.LANDSCAPE}
                    setValue={(name, value) => {
                      // FileUpload component manages its own state
                      // We handle the upload in onUpload callback
                    }}
                    onUpload={handleLogoUpload}
                    onFileRemove={
                      logoUrl ? () => handleLogoRemove() : undefined
                    }
                    initialFiles={
                      logoUrl
                        ? [
                            {
                              id: 'logo',
                              name: 'logo.png',
                              url: logoUrl,
                              type: 'image/png',
                              size: 0,
                            },
                          ]
                        : []
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Kleines Logo</label>
                  <p className="text-muted-foreground text-sm">
                    Ein kleineres Logo, überschreibt das Hauptlogo in kompakten
                    Bereichen.
                  </p>
                  <FileUpload
                    id="small-logo-upload"
                    name="smallLogo"
                    maxFiles={1}
                    accept="image/png, image/jpeg, image/gif, image/jpg, image/svg+xml, .svg"
                    placeholder="PNG, JPEG, GIF oder SVG (wird automatisch komprimiert). Sollte das Logo nicht richtig laden, bitte die Seite neu laden."
                    previewAspectRatio={PreviewAspectRatio.SQUARE}
                    setValue={(name, value) => {
                      // FileUpload component manages its own state
                      // We handle the upload in onUpload callback
                    }}
                    onUpload={handleSmallLogoUpload}
                    onFileRemove={
                      smallLogoUrl ? () => handleSmallLogoRemove() : undefined
                    }
                    initialFiles={
                      smallLogoUrl
                        ? [
                            {
                              id: 'small-logo',
                              name: 'small-logo.png',
                              url: smallLogoUrl,
                              type: 'image/png',
                              size: 0,
                            },
                          ]
                        : []
                    }
                  />
                </div>
              </div>
              <Separator />
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
              <CardTitle id="preferences-heading">Präferenzen</CardTitle>
              <CardDescription>
                Passen Sie die Terminologie und Präferenzen Ihrer Organisation
                an
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
                allowSelfSignOut={allowSelfSignOut}
                onAllowSelfSignOutChange={setAllowSelfSignOut}
              />
            </CardContent>
          </Card>
        </section>

        {/* PDF-Export Section */}
        <section
          id="pdf-export"
          ref={(el) => {
            sectionRefs.current['pdf-export'] = el;
          }}
          aria-labelledby="pdf-export-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="pdf-export-heading">PDF-Export</CardTitle>
              <CardDescription>
                Einstellungen für den PDF-Export Ihrer Organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationPdfExportForm
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
            </CardContent>
          </Card>
        </section>

        {/* Vorlagen (Templates) Section */}
        <section
          id="vorlagen"
          ref={(el) => {
            sectionRefs.current.vorlagen = el;
          }}
          aria-labelledby="vorlagen-heading"
        >
          <h2 id="vorlagen-heading" className="sr-only">
            Vorlagen
          </h2>
          <TemplatesOverviewSection orgId={orgId} />
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
                Personeneigenschaften
              </CardTitle>
              <CardDescription>
                Verwalte die benutzerdefinierten Eigenschaften für Benutzer in
                dieser Organisation. Diese können für personenbasierte
                Überprüfungen verwendet werden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserProperties organizationId={orgId} />
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
              <CardAction>
                <Button onClick={() => setIsInviteModalOpen(true)}>
                  {helperPlural} einladen
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <UsersManagementSection
                usersData={currentUserWithRoles || []}
                currentUserEmail={session?.user?.email || ''}
                onUserProfileClick={handleUserProfileClick}
                onInviteClick={() => setIsInviteModalOpen(true)}
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
          />
        )}

        <InviteUserForm
          organizationId={orgId}
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
        />
      </SettingsPageLayout>
    </>
  );
}
