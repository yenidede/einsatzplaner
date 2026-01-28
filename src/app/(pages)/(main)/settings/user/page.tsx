'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  LogOut,
  Upload,
  Trash2,
  Save,
  X,
  Calendar,
} from 'lucide-react';

import { useSessionValidation } from '@/hooks/useSessionValidation';
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
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import { Organization } from '@/features/settings/types';

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
import { Skeleton } from '@/components/ui/skeleton';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  CalendarIntegrationCard,
  NAV_ITEMS,
  type SectionId,
} from '@/components/settings';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';
import { UserSettingsMobileNav } from '@/components/settings/UserSettingsMobileNav';
import { cn, optimizeImage } from '@/lib/utils';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('account');
  const [showLogos, setShowLogos] = useState<boolean>(true);
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showDialog, AlertDialogComponent } = useAlertDialog();

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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Section refs for scroll-into-view
  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    account: null,
    preferences: null,
    notifications: null,
    calendar: null,
    organizations: null,
  });

  useSessionValidation({
    debug: false,
    onTokenExpired: () => {
      router.push('/signin');
    },
  });

  // Handle URL hash for direct section linking
  useEffect(() => {
    const section = searchParams.get('section') as SectionId | null;
    if (section && NAV_ITEMS.some((item) => item.id === section)) {
      setActiveSection(section);
      setTimeout(() => {
        sectionRefs.current[section]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!profilePictureFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(profilePictureFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [profilePictureFile]);

  const { data: userData, isLoading: isLoadingUser } = useUserProfile(
    session?.user?.id
  );
  const { data: salutations = [] } = useSalutations();

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
    }
  }, [userData]);

  // Set default section in URL if none is specified (after userData loads)
  useEffect(() => {
    if (!userData) return;
    const section = searchParams.get('section') as SectionId | null;
    if (!section) {
      router.replace('/settings/user?section=account', { scroll: false });
    }
  }, [userData, searchParams, router]);

  const mutation = useUpdateUserProfile(session?.user?.id);
  const leaveOrgMutation = useLeaveOrganization(session?.user?.id);

  // Get managed organizations
  const managedOrgs = organizations.filter((org) => {
    if (!Array.isArray(org.roles)) return false;
    return org.roles.some((role: any) => {
      const roleName = typeof role === 'string' ? role : role?.name || '';
      const roleAbbr = typeof role === 'string' ? '' : role?.abbreviation || '';
      const nameLower = roleName.toLowerCase();
      const abbrLower = roleAbbr.toLowerCase();
      return (
        nameLower.includes('organisationsverwaltung') ||
        nameLower.includes('superadmin') ||
        abbrLower === 'ov' ||
        nameLower === 'ov'
      );
    });
  });

  const handleSectionChange = useCallback(
    (sectionId: SectionId) => {
      setActiveSection(sectionId);
      router.push(`/settings/user?section=${sectionId}`, { scroll: false });
      sectionRefs.current[sectionId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    },
    [router]
  );

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
      confirmText: 'Verlassen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
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

  if (status === 'unauthenticated') {
    signOut({ callbackUrl: '/signin' });
    return null;
  }

  const initials =
    `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase();

  // Loading skeleton
  if (isLoadingUser) {
    return (
      <div className="bg-background min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            <aside className="hidden w-64 shrink-0 lg:block">
              <Skeleton className="mb-6 h-10 w-full" />
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
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

  if (!userData) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Fehler</CardTitle>
            <CardDescription>Keine Benutzerdaten gefunden.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>Zur Startseite</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const header = (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-16 z-40 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1>Einstellungen</h1>
          <p className="text-muted-foreground text-sm">
            Verwalte dein Konto und deine Präferenzen
          </p>
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
      {AlertDialogComponent}
      <SettingsPageLayout
        header={header}
        mobileNav={mobileNav}
        activeUserSection={activeSection}
        onUserSectionChange={handleSectionChange}
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
                    const normalizedRoles = Array.isArray(org.roles)
                      ? org.roles.map((r: any) =>
                          typeof r === 'string' ? { name: r } : r
                        )
                      : [];

                    return (
                      <div
                        key={org.id}
                        className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{org.name}</h3>
                          {normalizedRoles.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {normalizedRoles.map(
                                (role: any, index: number) => {
                                  const label =
                                    role?.abbreviation?.trim() ||
                                    role?.name ||
                                    '';
                                  const roleName = role?.name ?? '';
                                  let bgColor = 'bg-secondary';
                                  if (roleName === 'Superadmin')
                                    bgColor = 'bg-rose-100 text-rose-700';
                                  else if (
                                    roleName === 'OV' ||
                                    roleName === 'Organisationsverwaltung'
                                  )
                                    bgColor = 'bg-red-100 text-red-700';
                                  else if (
                                    roleName === 'EV' ||
                                    roleName === 'Einsatzverwaltung'
                                  )
                                    bgColor = 'bg-orange-100 text-orange-700';
                                  else if (
                                    roleName === 'Helfer:in' ||
                                    roleName === 'Helfer'
                                  )
                                    bgColor = 'bg-cyan-100 text-cyan-700';

                                  return (
                                    <span
                                      key={role.id ?? index}
                                      className={cn(
                                        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
                                        bgColor
                                      )}
                                    >
                                      {label}
                                    </span>
                                  );
                                }
                              )}
                            </div>
                          )}
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
