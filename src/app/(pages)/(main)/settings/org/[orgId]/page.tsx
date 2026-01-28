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
import { OrgManageNav } from '@/components/settings/OrgManageNav';
import {
  ORG_MANAGE_NAV_ITEMS,
  type OrgManageSectionId,
} from '@/components/settings/org-manage-constants';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { OrgSettingsMobileNav } from '@/components/settings/OrgSettingsMobileNav';
import { signOut } from 'next-auth/react';
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

  const [activeSection, setActiveSection] =
    useState<OrgManageSectionId>('details');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Section refs for scroll-into-view
  const sectionRefs = useRef<Record<OrgManageSectionId, HTMLElement | null>>({
    details: null,
    preferences: null,
    addresses: null,
    'bank-accounts': null,
    'user-properties': null,
    users: null,
  });

  const isScrollingProgrammatically = useRef(false);
  const isUpdatingUrlFromScroll = useRef(false);
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

  const { data: userData, isLoading: isLoadingUser } = useUserProfile(
    session?.user?.id
  );

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

  const updateMutation = useUpdateOrganization(orgId);
  useEffect(() => {
    const section = searchParams.get('section') as OrgManageSectionId | null;
    if (section && ORG_MANAGE_NAV_ITEMS.some((item) => item.id === section)) {
      setActiveSection(section);
      isScrollingProgrammatically.current = true;
      setTimeout(() => {
        sectionRefs.current[section]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 500);
      }, 100);
    }
  }, [searchParams]);

  const handleSave = useCallback(() => {
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

  const handleSectionChange = useCallback(
    (sectionId: OrgManageSectionId) => {
      setActiveSection(sectionId);
      router.push(`/settings/org/${orgId}?section=${sectionId}`, {
        scroll: false,
      });
      isScrollingProgrammatically.current = true;
      sectionRefs.current[sectionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      setTimeout(() => {
        isScrollingProgrammatically.current = false;
      }, 500);
    },
    [router, orgId]
  );

  // Set default section in URL if none is specified
  useEffect(() => {
    if (!orgData) return;
    const section = searchParams.get('section') as OrgManageSectionId | null;
    if (!section) {
      router.replace(`/settings/org/${orgId}?section=details`, {
        scroll: false,
      });
    }
  }, [orgData, searchParams, router, orgId]);

  // Handle scroll-based section detection and URL updates
  useEffect(() => {
    if (!orgData) return;

    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -50% 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      if (isScrollingProgrammatically.current) return;

      const headerOffset = 100;
      const visibleSections = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => {
          const rect = entry.boundingClientRect;
          const distanceFromTop = Math.max(0, rect.top - headerOffset);
          return {
            entry,
            sectionId: entry.target.id as OrgManageSectionId,
            distanceFromTop,
            intersectionRatio: entry.intersectionRatio,
            top: rect.top,
          };
        })
        .filter(
          (item) =>
            item.sectionId &&
            ORG_MANAGE_NAV_ITEMS.some(
              (navItem) => navItem.id === item.sectionId
            )
        )
        .sort((a, b) => {
          const aIsActive = a.top <= headerOffset + 50;
          const bIsActive = b.top <= headerOffset + 50;

          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;

          if (Math.abs(a.distanceFromTop - b.distanceFromTop) > 30) {
            return a.distanceFromTop - b.distanceFromTop;
          }

          return b.intersectionRatio - a.intersectionRatio;
        });

      if (visibleSections.length > 0) {
        const detectedSection = visibleSections[0].sectionId;
        if (detectedSection !== activeSection) {
          setActiveSection(detectedSection);
          const currentSection = searchParams.get('section');
          if (currentSection !== detectedSection) {
            isUpdatingUrlFromScroll.current = true;
            router.replace(
              `/settings/org/${orgId}?section=${detectedSection}`,
              {
                scroll: false,
              }
            );
          }
        }
      }
    };

    const observer = new IntersectionObserver(
      handleIntersection,
      observerOptions
    );

    const timeoutId = setTimeout(() => {
      Object.values(sectionRefs.current).forEach((section) => {
        if (section) {
          observer.observe(section);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [activeSection, router, searchParams, orgData, orgId]);

  // Handle URL hash for direct section linking
  useEffect(() => {
    if (isUpdatingUrlFromScroll.current) {
      isUpdatingUrlFromScroll.current = false;
      return;
    }

    const section = searchParams.get('section') as OrgManageSectionId | null;
    if (section && ORG_MANAGE_NAV_ITEMS.some((item) => item.id === section)) {
      setActiveSection(section);
      isScrollingProgrammatically.current = true;
      setTimeout(() => {
        sectionRefs.current[section]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 500);
      }, 100);
    }
  }, [searchParams]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.push('/');
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, handleSave]);

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
    return (
      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <aside className="hidden w-64 shrink-0 lg:block">
              <Skeleton className="mb-6 h-10 w-full" />
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </aside>
            <main className="flex-1 space-y-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </main>
          </div>
        </div>
      </div>
    );
  }

  if (orgError || !orgData) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Fehler</CardTitle>
            <CardDescription>
              {orgError
                ? 'Fehler beim Laden der Organisation'
                : 'Organisation nicht gefunden'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>Zur Startseite</Button>
          </CardContent>
        </Card>
      </div>
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

  const sidebar = (
    <OrgManageNav
      currentOrgId={orgId}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
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
        sidebar={sidebar}
        mobileNav={mobileNav}
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
