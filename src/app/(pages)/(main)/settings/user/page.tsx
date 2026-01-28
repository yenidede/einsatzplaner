'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  LogOut,
  Upload,
  Trash2,
  Calendar,
} from 'lucide-react';
import Image from 'next/image';
import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';
import {
  uploadProfilePictureAction,
  updateOrgMailNotificationAction,
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
import { useAlertDialog } from '@/contexts/AlertDialogContext';
import { useUnsavedChanges } from '@/components/settings/hooks/useUnsavedChanges';
import { OrganizationBase } from '@/features/settings/types';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  CalendarIntegrationCard,
  NAV_ITEMS,
  type SectionId,
} from '@/components/settings';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { UserSettingsMobileNav } from '@/components/settings/UserSettingsMobileNav';
import { SettingsLoadingSkeleton } from '@/components/settings/SettingsLoadingSkeleton';
import { SettingsErrorCard } from '@/components/settings/SettingsErrorCard';
import { useSectionNavigation } from '@/components/settings/hooks/useSectionNavigation';
import { useSettingsKeyboardShortcuts } from '@/components/settings/hooks/useSettingsKeyboardShortcuts';
import { useSettingsSessionValidation } from '@/components/settings/hooks/useSettingsSessionValidation';
import { optimizeImage } from '@/lib/utils';
import { RolesList } from '@/components/Roles';

export default function SettingsPage() {
  const [showLogos, setShowLogos] = useState<boolean>(true);
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { showDialog } = useAlertDialog();

  // Form state
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [firstname, setFirstname] = useState<string>('');
  const [lastname, setLastname] = useState<string>('');
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [salutationId, setSalutationId] = useState<string>('');
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(
    null
  );
  const [organizations, setOrganizations] = useState<OrganizationBase[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Initial values for change detection
  const initialValuesRef = useRef<{
    email: string;
    phone: string;
    firstname: string;
    lastname: string;
    pictureUrl: string | null;
    salutationId: string;
    showLogos: boolean;
    organizations: OrganizationBase[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: userData, isLoading: isLoadingUser } = useUserProfile(
    session?.user?.id
  );
  const { data: salutations = [] } = useSalutations();

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
    if (!profilePictureFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(profilePictureFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [profilePictureFile]);

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
        organizations:
          userData.organizations && Array.isArray(userData.organizations)
            ? userData.organizations.map((org) => ({
                ...org,
                hasGetMailNotification: org.hasGetMailNotification ?? true,
              }))
            : [],
      };
      // Clear profile picture file when data is refreshed
      setProfilePictureFile(null);
    }
  }, [userData]);

  const mutation = useUpdateUserProfile(session?.user?.id);
  const leaveOrgMutation = useLeaveOrganization(session?.user?.id);

  // Check for unsaved changes
  const hasUnsavedChanges = (() => {
    if (!initialValuesRef.current) return false;
    const initial = initialValuesRef.current;

    return (
      email !== initial.email ||
      phone !== initial.phone ||
      firstname !== initial.firstname ||
      lastname !== initial.lastname ||
      pictureUrl !== initial.pictureUrl ||
      salutationId !== initial.salutationId ||
      showLogos !== initial.showLogos ||
      profilePictureFile !== null ||
      JSON.stringify(
        organizations.map((org) => ({
          id: org.id,
          hasGetMailNotification: org.hasGetMailNotification,
        }))
      ) !==
        JSON.stringify(
          initial.organizations.map((org) => ({
            id: org.id,
            hasGetMailNotification: org.hasGetMailNotification,
          }))
        )
    );
  })();

  const handleSave = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      let finalPictureUrl = pictureUrl;

      if (profilePictureFile) {
        const toastId = toast.loading('Profilbild wird komprimiert...');
        try {
          // Compress image before upload
          let fileToUpload = profilePictureFile;
          const originalSizeMB = profilePictureFile.size / (1024 * 1024);

          // Only compress if file is larger than 1MB
          if (originalSizeMB > 1) {
            toast.loading('Profilbild wird komprimiert...', { id: toastId });
            try {
              fileToUpload = await optimizeImage(profilePictureFile, {
                maxSizeMB: 0.8, // Target 800KB
                maxWidthOrHeight: 1200,
                useWebWorker: true,
              });
              const compressedSizeMB = fileToUpload.size / (1024 * 1024);
              console.log(
                `Image compressed: ${originalSizeMB.toFixed(2)}MB -> ${compressedSizeMB.toFixed(2)}MB`
              );
            } catch (compressError) {
              console.warn(
                'Image compression failed, using original:',
                compressError
              );
              // Continue with original file if compression fails
              fileToUpload = profilePictureFile;
            }
          }

          toast.loading('Profilbild wird hochgeladen...', { id: toastId });
          const formData = new FormData();
          formData.append('file', fileToUpload);
          const res = await uploadProfilePictureAction(formData);
          if (!res) throw new Error('Upload fehlgeschlagen');
          finalPictureUrl = res.picture_url;
          toast.success('Profilbild erfolgreich hochgeladen!', { id: toastId });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Fehler beim Hochladen des Profilbilds';
          toast.error(errorMessage, { id: toastId });
          throw error;
        }
      }

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
          organizations: organizations.map((org) => ({
            ...org,
            hasGetMailNotification: org.hasGetMailNotification ?? true,
          })),
        };
      }
      setProfilePictureFile(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unbekannter Fehler'
      );
    }
  }, [
    session,
    pictureUrl,
    profilePictureFile,
    mutation,
    email,
    firstname,
    lastname,
    phone,
    salutationId,
    showLogos,
    organizations,
    update,
    queryClient,
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

  const handleProfilePictureUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) setProfilePictureFile(file);
  };

  const handleRemoveProfilePicture = async () => {
    if (!session?.user?.id) return;

    const toastId = toast.loading('Profilbild wird entfernt...');
    try {
      await removeProfilePictureAction();
      setProfilePictureFile(null);
      setPictureUrl(null);
      setPreviewUrl(null);

      await update({
        user: { ...session.user, picture_url: null },
      });

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

    const result = await showDialog({
      title: 'Organisation verlassen',
      description: `Möchten Sie wirklich ${orgName} verlassen? Sie verlieren den Zugriff auf alle Daten dieser Organisation.`,
    });

    if (result !== 'success') return;

    const toastId = toast.loading('Organisation wird verlassen...');
    try {
      await leaveOrgMutation.mutateAsync({
        userId: session.user.id,
        organizationId,
      });
      toast.success(`${orgName} erfolgreich verlassen.`, { id: toastId });
    } catch (err) {
      toast.error(
        `Fehler beim Verlassen der Organisation.${err instanceof Error ? ' ' + err.message : ''}`,
        { id: toastId }
      );
    }
  };

  const handleNotificationChange = (orgId: string, checked: boolean) => {
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId ? { ...o, hasGetMailNotification: checked } : o
      )
    );
  };

  // Use shared keyboard shortcuts hook
  useSettingsKeyboardShortcuts({
    onSave: handleSave,
  });

  if (status === 'unauthenticated') {
    signOut({ callbackUrl: '/signin' });
    return null;
  }

  const initials =
    `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase();

  // Loading skeleton
  if (isLoadingUser) {
    return <SettingsLoadingSkeleton />;
  }

  if (!userData) {
    return (
      <SettingsErrorCard
        title="Fehler"
        description="Keine Benutzerdaten gefunden."
      />
    );
  }

  const header = (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1>Persönliche Einstellungen</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => router.push('/')}>
            Abbrechen
            <span className="ml-2 hidden sm:inline">
              <Kbd>ESC</Kbd>
            </span>
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'Speichert...' : 'Speichern'}
            <KbdGroup className="hidden sm:flex">
              <Kbd>⌘</Kbd>
              <Kbd>S</Kbd>
            </KbdGroup>
          </Button>
        </div>
      </div>
    </header>
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
                Aktualisiere dein Profilbild und persönliche Informationen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={previewUrl || pictureUrl || undefined}
                    alt={`Profilbild von ${firstname} ${lastname}`}
                  />
                  <AvatarFallback className="text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleProfilePictureUpload}
                      aria-label="Profilbild hochladen"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Bild hochladen
                    </Button>
                    {(pictureUrl || previewUrl) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveProfilePicture}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Entfernen
                      </Button>
                    )}
                  </div>
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
                    placeholder="+49 123 456789"
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
                Verwalte E-Mail-Benachrichtigungen für deine Organisationen
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizations.length > 0 ? (
                <div className="space-y-4">
                  {organizations.map((org) => {
                    const isOn = org.hasGetMailNotification ?? true;
                    return (
                      <div
                        key={org.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-0.5">
                          <Label
                            htmlFor={`notification-${org.id}`}
                            className="text-base font-medium"
                          >
                            {org.name}
                          </Label>
                          <p className="text-muted-foreground text-sm">
                            E-Mail-Benachrichtigungen erhalten
                          </p>
                        </div>
                        <Switch
                          id={`notification-${org.id}`}
                          checked={isOn}
                          onCheckedChange={(checked) =>
                            handleNotificationChange(org.id, checked)
                          }
                          aria-label={`E-Mail-Benachrichtigungen für ${org.name}`}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
                  <Bell className="text-muted-foreground/50 mb-4 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">
                    Du bist noch keiner Organisation beigetreten.
                  </p>
                </div>
              )}
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
                Abonniere Kalender deiner Organisationen in externen Apps wie
                Google Calendar, Apple Calendar oder Outlook
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
                        Kopiere die URL oder klicke auf &quot;In Kalender
                        öffnen&quot;
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                          2
                        </span>
                        Füge die URL in deiner Kalender-App als Abonnement hinzu
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-primary/10 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                          3
                        </span>
                        Dein Kalender synchronisiert automatisch alle Ereignisse
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
                    Du bist noch keiner Organisation beigetreten.
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Kalender-Integrationen werden verfügbar, sobald du einer
                    Organisation beitrittst.
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
                Übersicht deiner Mitgliedschaften und Rollen
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
                            <RolesList unsortedRoles={org.roles} />
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
                    Du bist noch keiner Organisation beigetreten.
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
