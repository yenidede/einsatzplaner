'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, LogOut, Trash2, Calendar } from 'lucide-react';
import Image from 'next/image';
import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';
import {
  uploadProfilePictureAction,
  removeProfilePictureAction,
} from '@/features/settings/settings-action';
import {
  useUserProfile,
  useSalutations,
} from '@/features/settings/hooks/useUserProfile';
import {
  useUpdateUserProfile,
  useLeaveOrganization,
} from '@/features/settings/hooks/useSettingsMutations';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useUnsavedChanges } from '@/components/settings/hooks/useUnsavedChanges';
import { OrganizationBase } from '@/features/settings/types';

import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/form/file-upload';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CalendarIntegrationCard,
  NAV_ITEMS,
  type SectionId,
} from '@/components/settings';
import { PageHeader } from '@/components/settings/PageHeader';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { UserSettingsMobileNav } from '@/components/settings/UserSettingsMobileNav';
import { SettingsLoadingSkeleton } from '@/components/settings/SettingsLoadingSkeleton';
import { SettingsErrorCard } from '@/components/settings/SettingsErrorCard';
import { useSectionNavigation } from '@/components/settings/hooks/useSectionNavigation';
import { useSettingsKeyboardShortcuts } from '@/components/settings/hooks/useSettingsKeyboardShortcuts';
import { useSettingsSessionValidation } from '@/components/settings/hooks/useSettingsSessionValidation';
import { createRoleNameOverrides, RolesList } from '@/components/Roles';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import {
  NotificationPreferenceForm,
  type NotificationPreferenceFormHandle,
  notificationPreferenceQueryKeys,
} from '@/features/notification-preferences';

export default function SettingsPage() {
  const [showLogos, setShowLogos] = useState<boolean>(true);
  const { data: session, status, update } = useSession();
  const { showDestructive } = useConfirmDialog();

  // Form state
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [firstname, setFirstname] = useState<string>('');
  const [lastname, setLastname] = useState<string>('');
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [salutationId, setSalutationId] = useState<string>('');
  const [organizations, setOrganizations] = useState<OrganizationBase[]>([]);
  const [notificationHasUnsavedChanges, setNotificationHasUnsavedChanges] =
    useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const notificationPreferenceFormRef =
    useRef<NotificationPreferenceFormHandle | null>(null);

  // Initial values for change detection
  const initialValuesRef = useRef<{
    email: string;
    phone: string;
    firstname: string;
    lastname: string;
    pictureUrl: string | null;
    salutationId: string;
    showLogos: boolean;
  } | null>(null);

  const queryClient = useQueryClient();

  const { data: userData, isLoading: isLoadingUser } = useUserProfile(
    session?.user?.id
  );
  const { data: salutations = [] } = useSalutations();
  const { isAuthorized, isLoading } = usePermissionGuard({
    requiredPermissions: ['settings:read'],
    requireAll: false,
  });

  // Use shared section navigation hook
  const {
    activeSection,
    sectionRefs,
    handleSectionChange: originalHandleSectionChange,
  } = useSectionNavigation<SectionId>({
    navItems: NAV_ITEMS,
    defaultSection: 'account',
    basePath: '/settings/user',
    shouldSetDefault: !!userData,
  });

  // Use shared session validation hook
  useSettingsSessionValidation();

  useEffect(() => {
    if (userData) {
      setEmail(userData.email ?? '');
      setPhone(userData.phone ?? '');
      setFirstname(userData.firstname ?? '');
      setLastname(userData.lastname ?? '');
      setPictureUrl(userData.picture_url);
      setSalutationId(userData.salutationId);
      setShowLogos(userData.hasLogoinCalendar ?? true);
      if (userData.organizations && Array.isArray(userData.organizations)) {
        setOrganizations(userData.organizations);
      }

      // Update initial values whenever userData changes (including after save/refetch)
      initialValuesRef.current = {
        email: userData.email ?? '',
        phone: userData.phone ?? '',
        firstname: userData.firstname ?? '',
        lastname: userData.lastname ?? '',
        pictureUrl: userData.picture_url,
        salutationId: userData.salutationId,
        showLogos: userData.hasLogoinCalendar ?? true,
      };
    }
  }, [userData]);

  const mutation = useUpdateUserProfile(session?.user?.id);
  const leaveOrgMutation = useLeaveOrganization(session?.user?.id);

  // Check for unsaved changes
  const hasProfileUnsavedChanges = (() => {
    if (!initialValuesRef.current) return false;
    const initial = initialValuesRef.current;

    return (
      email !== initial.email ||
      phone !== initial.phone ||
      firstname !== initial.firstname ||
      lastname !== initial.lastname ||
      pictureUrl !== initial.pictureUrl ||
      salutationId !== initial.salutationId ||
      showLogos !== initial.showLogos
    );
  })();
  const hasUnsavedChanges =
    hasProfileUnsavedChanges || notificationHasUnsavedChanges;

  const handleSave = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      if (hasProfileUnsavedChanges) {
        const finalPictureUrl = pictureUrl;

        await mutation.mutateAsync({
          id: session.user.id,
          email,
          firstname,
          lastname,
          phone,
          picture_url: finalPictureUrl || undefined,
          salutationId,
          hasLogoinCalendar: showLogos,
        });

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
          queryKey: settingsQueryKeys.user.settings(session?.user.id || ''),
        });

        // Note: Initial values will be updated automatically when userData refetches
        // But we also update them here immediately to prevent false positives
        if (initialValuesRef.current) {
          initialValuesRef.current = {
            email,
            phone,
            firstname,
            lastname,
            pictureUrl: finalPictureUrl,
            salutationId,
            showLogos,
          };
        }
      }

      if (notificationPreferenceFormRef.current?.hasUnsavedChanges()) {
        setIsSavingNotifications(true);
        try {
          await notificationPreferenceFormRef.current.saveChanges();
        } finally {
          setIsSavingNotifications(false);
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unbekannter Fehler'
      );
    }
  }, [
    session,
    pictureUrl,
    hasProfileUnsavedChanges,
    mutation,
    email,
    firstname,
    lastname,
    phone,
    salutationId,
    showLogos,
    update,
    queryClient,
    notificationPreferenceFormRef,
  ]);

  // Use unsaved changes hook
  const { handleSectionChangeWithCheck, navigateWithCheck } =
    useUnsavedChanges<SectionId>({
      hasUnsavedChanges,
      onSectionChange: originalHandleSectionChange,
    });

  // Wrapper for section change that checks for unsaved changes
  const handleSectionChange = useCallback(
    (section: SectionId) => {
      handleSectionChangeWithCheck(section);
    },
    [handleSectionChangeWithCheck]
  );

  const handleRemoveProfilePicture = async () => {
    if (!session?.user?.id) return;

    const toastId = toast.loading('Profilbild wird entfernt...');
    try {
      await removeProfilePictureAction();
      setPictureUrl(null);

      await update({
        user: { ...session.user, picture_url: null },
      });

      // Keep local "initial values" in sync with saved state to avoid
      // unsaved-changes prompts until the profile refetch completes.
      if (initialValuesRef.current) {
        initialValuesRef.current = {
          ...initialValuesRef.current,
          pictureUrl: null,
        };
      }

      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.user.settings(session.user.id),
      });

      toast.success('Profilbild erfolgreich entfernt!', { id: toastId });
    } catch (error) {
      toast.error(
        `Fehler beim Entfernen des Profilbilds${error instanceof Error ? ': ' + error.message : ''}`,
        { id: toastId }
      );
    }
  };

  const handleOrganizationLeave = async (organizationId: string) => {
    if (!session?.user?.id) return;

    const orgName =
      organizations.find((org) => org.id === organizationId)?.name ||
      'Organisation';

    const result = await showDestructive(
      'Organisation verlassen',
      `Möchten Sie wirklich ${orgName} verlassen? Sie verlieren den Zugriff auf alle Daten dieser Organisation.`
    );

    if (result !== 'success') return;

    const toastId = toast.loading('Organisation wird verlassen...');
    try {
      await leaveOrgMutation.mutateAsync({
        userId: session.user.id,
        organizationId,
      });
      queryClient.invalidateQueries({
        queryKey: notificationPreferenceQueryKeys.user.cards(session.user.id),
      });
      toast.success(`${orgName} erfolgreich verlassen.`, { id: toastId });
    } catch (err) {
      toast.error(
        `Fehler beim Verlassen der Organisation.${err instanceof Error ? ' ' + err.message : ''}`,
        { id: toastId }
      );
    }
  };

  // Use shared keyboard shortcuts hook
  useSettingsKeyboardShortcuts({
    onSave: handleSave,
  });

  if (status === 'unauthenticated') {
    signOut({ callbackUrl: '/signin' });
    return null;
  }
  if (isLoading) {
    return <div>Lade Nutzerdaten...</div>;
  }

  if (!isAuthorized) {
    return <div>Keine Berechtigung. Weiterleitung...</div>;
  }
  const initials =
    `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase();

  // Loading skeleton
  if (isLoadingUser) {
    return <SettingsLoadingSkeleton />;
  }

  if (!userData) {
    if (isLoadingUser) {
      return (
        <SettingsErrorCard
          title="Lade Benutzerdaten..."
          description="Bitte warten Sie einen Moment. Sollte sich dieser Status nicht ändern, laden Sie die Seite bitte neu."
        />
      );
    }

    return (
      <SettingsErrorCard
        title="Fehler beim Laden der Benutzerdaten"
        description="Bitte warten Sie einen Moment. Sollte sich dieser Status nicht ändern, laden Sie die Seite bitte neu."
      />
    );
  }

  const header = (
    <PageHeader
      title="Persönliche Einstellungen"
      onSave={handleSave}
      isSaving={mutation.isPending || isSavingNotifications}
      onCancel={() => navigateWithCheck('/')}
    />
  );

  const mobileNav = (
    <UserSettingsMobileNav
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    />
  );

  return (
    <>
      <SettingsPageLayout
        header={header}
        mobileNav={mobileNav}
        onUserSectionChange={handleSectionChange}
        onNavigate={navigateWithCheck}
      >
        {/* Account Section */}
        <section
          id="account"
          ref={(el) => {
            sectionRefs.current.account = el;
          }}
          aria-labelledby="account-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="account-heading">Mein Account</CardTitle>
              <CardDescription>
                Aktualisieren Sie Ihr Profilbild und Ihre persönlichen
                Informationen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={pictureUrl || undefined}
                    alt={`Profilbild von ${firstname} ${lastname}`}
                  />
                  <AvatarFallback className="text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <FileUpload
                    id="profile-picture-upload"
                    name="profilePicture"
                    variant="buttons"
                    accept="image/*"
                    maxFiles={1}
                    placeholder="JPG, PNG oder GIF. Große Bilder werden automatisch komprimiert."
                    disabled={mutation.isPending}
                    initialFiles={
                      pictureUrl
                        ? [
                            {
                              id: 'profile-picture',
                              name: 'Profilbild',
                              size: 0,
                              type: 'image/*',
                              url: pictureUrl,
                            },
                          ]
                        : []
                    }
                    setValue={(_name, value) => {
                      const nextUrl =
                        Array.isArray(value) && typeof value[0] === 'string'
                          ? value[0]
                          : null;
                      setPictureUrl(nextUrl);
                    }}
                    onUpload={async (optimizedFile) => {
                      const formData = new FormData();
                      formData.append('file', optimizedFile);
                      const res = await uploadProfilePictureAction(formData);
                      if (!res) throw new Error('Upload fehlgeschlagen');
                      if (initialValuesRef.current) {
                        initialValuesRef.current = {
                          ...initialValuesRef.current,
                          pictureUrl: res.picture_url,
                        };
                      }
                      if (session) {
                        try {
                          await update({
                            user: {
                              ...session.user,
                              picture_url: res.picture_url,
                            },
                          });
                        } catch (error) {
                          console.error(
                            'Failed to sync session profile picture:',
                            error
                          );
                        }
                      }
                      return res.picture_url;
                    }}
                    onFileRemove={async () => {
                      await handleRemoveProfilePicture();
                    }}
                    uploadLabel="Bild hochladen"
                    removeLabel="Entfernen"
                  />
                  <p className="text-muted-foreground text-xs">
                    JPG, PNG oder GIF. Große Bilder werden automatisch
                    komprimiert.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstname">Vorname</Label>
                  <Input
                    id="firstname"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    placeholder="Max"
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">Nachname</Label>
                  <Input
                    id="lastname"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    placeholder="Mustermann"
                    autoComplete="family-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="max@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+43 123 456789"
                    autoComplete="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salutation">Anrede</Label>
                  <Select
                    value={salutationId || ''}
                    onValueChange={setSalutationId}
                  >
                    <SelectTrigger id="salutation" className="w-full sm:w-64">
                      <SelectValue placeholder="Anrede wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {salutations.map((sal) => (
                        <SelectItem key={sal.id} value={sal.id}>
                          {sal.salutation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Wird für personalisierte Kommunikation verwendet
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Notifications Section */}
        <section
          id="notifications"
          ref={(el) => {
            sectionRefs.current.notifications = el;
          }}
          aria-labelledby="notifications-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="notifications-heading">
                Benachrichtigungen
              </CardTitle>
              <CardDescription>
                Legen Sie pro Organisation fest, ob E-Mails sofort oder als
                Sammelmail ankommen und ab welchen Meldungsstufen Sie informiert
                werden.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferenceForm
                ref={notificationPreferenceFormRef}
                userId={session?.user?.id}
                disabled={mutation.isPending || isSavingNotifications}
                onUnsavedChangesChange={setNotificationHasUnsavedChanges}
              />
            </CardContent>
          </Card>
        </section>

        {/* Calendar Section */}
        <section
          id="calendar"
          ref={(el) => {
            sectionRefs.current.calendar = el;
          }}
          aria-labelledby="calendar-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="calendar-heading">
                Kalender-Integrationen
              </CardTitle>
              <CardDescription>
                Abonnieren Sie Kalender Ihrer Organisationen in externen Apps
                wie Google Calendar, Apple Calendar oder Outlook
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizations.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="mb-2 text-sm font-medium">
                      So funktioniert&apos;s
                    </h4>
                    <ol className="text-muted-foreground space-y-2 text-sm">
                      <li className="flex gap-2">
                        <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                          1
                        </span>
                        Kopieren Sie die URL oder klicken Sie auf &quot;In
                        Kalender öffnen&quot;
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                          2
                        </span>
                        Fügen Sie die URL in Ihrer Kalender-App als Abonnement
                        hinzu
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                          3
                        </span>
                        Ihr Kalender synchronisiert automatisch alle Ereignisse
                      </li>
                    </ol>
                  </div>

                  <Separator className="my-6" />

                  {organizations.map((org) => (
                    <CalendarIntegrationCard key={org.id} org={org} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                  <Calendar className="text-muted-foreground/50 mb-4 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">
                    Sie sind noch keiner Organisation beigetreten.
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Kalender-Integrationen werden verfügbar, sobald Sie einer
                    Organisation beitreten.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Organizations Section */}
        <section
          id="organizations"
          ref={(el) => {
            sectionRefs.current.organizations = el;
          }}
          aria-labelledby="organizations-heading"
        >
          <Card>
            <CardHeader>
              <CardTitle id="organizations-heading">
                Meine Organisationen
              </CardTitle>
              <CardDescription>
                Übersicht Ihrer Mitgliedschaften und Rollen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizations.length > 0 ? (
                <div className="space-y-4">
                  {organizations.map((org) => {
                    const logoUrl = org.small_logo_url || org.logo_url;
                    return (
                      <div
                        key={org.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 pl-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center">
                          <div className="flex w-20 justify-center">
                            {logoUrl ? (
                              <Image
                                src={logoUrl}
                                alt={org.name}
                                width={80}
                                height={60}
                              />
                            ) : (
                              <div className="bg-muted flex size-10 items-center justify-center rounded-full p-2">
                                <Building2 className="size-4" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">
                              {org.name}
                            </h3>
                            <RolesList
                              unsortedRoles={org.roles}
                              roleNameOverrides={createRoleNameOverrides(
                                org.helper_name_singular ?? 'Helfer'
                              )}
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOrganizationLeave(org.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Verlassen
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                  <Building2 className="text-muted-foreground/50 mb-4 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">
                    Sie sind noch keiner Organisation beigetreten.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Mobile Logout */}
        <div className="lg:hidden">
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Ausloggen
          </Button>
        </div>
      </SettingsPageLayout>
    </>
  );
}
