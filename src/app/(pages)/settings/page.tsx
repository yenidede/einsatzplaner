'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { settingsQueryKeys } from '@/features/settings/queryKeys/queryKey';
import {
  updateUserProfileAction,
  uploadProfilePictureAction,
  updateOrgMailNotificationAction,
  UserUpdateData,
  removeUserFromOrganizationAction,
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
import { OrganizationSidebar } from '@/features/settings/components/manage/OrganizationSideBar';
import { AccountSection } from '@/features/settings/components/allgemein/AccountSection';
import { PersonalPreferencesSection } from '@/features/settings/components/allgemein/PersonalPreferencesSection';
import { NotificationsSection } from '@/features/settings/components/allgemein/NotificationsSection';
import { OrganizationsSection } from '@/features/settings/components/allgemein/OrganizationsSection';
import { Organization } from '@/features/settings/types';
import { SettingsHeader } from '@/features/settings/components/SettingsHeader';

export default function SettingsPage() {
  const [showLogos, setShowLogos] = useState<boolean>(true);
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { showDialog, AlertDialogComponent } = useAlertDialog();
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

  const queryClient = useQueryClient();

  useSessionValidation({
    debug: false,
    onTokenExpired: () => {
      console.log('Token abgelaufen - leite zu Login weiter');
      router.push('/signin');
    },
  });

  useEffect(() => {
    if (!profilePictureFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(profilePictureFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
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

  const mutation = useUpdateUserProfile(session?.user?.id);

  const leaveOrgMutation = useLeaveOrganization(session?.user?.id);

  const handleSave = async () => {
    if (!session?.user?.id) return;

    try {
      let finalPictureUrl = pictureUrl;

      if (profilePictureFile) {
        const toastId = toast.loading('Profilbild wird hochgeladen...');
        try {
          const formData = new FormData();
          formData.append('file', profilePictureFile);
          const res = await uploadProfilePictureAction(formData);
          if (!res) {
            throw new Error(`Upload fehlgeschlagen`);
          }
          finalPictureUrl = res.picture_url;
          toast.success('Profilbild erfolgreich hochgeladen!', { id: toastId });
        } catch (error) {
          toast.error('Fehler beim Hochladen des Profilbilds', { id: toastId });
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
        queryKey: settingsQueryKeys.userSettings(session?.user.id || ''),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unbekannter Fehler'
      );
    }
  };

  const handleProfilePictureUpload = (file: File) => {
    setProfilePictureFile(file);
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
        user: {
          ...session.user,
          picture_url: null,
        },
      });

      queryClient.invalidateQueries({
        queryKey: settingsQueryKeys.userSettings(session.user.id),
      });

      toast.success('Profilbild erfolgreich entfernt!', { id: toastId });
    } catch (error) {
      toast.error(
        `Fehler beim Entfernen des Profilbilds${
          error instanceof Error ? ': ' + error.message : ''
        }`,
        { id: toastId }
      );
    }
  };

  async function handleOrganizationLeave(organizationId: string) {
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
        `Fehler beim Verlassen der Organisation.${
          err instanceof Error ? ' ' + err.message : ''
        }`,
        { id: toastId }
      );
    }
  }

  const handleNotificationChange = (orgId: string, checked: boolean) => {
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId ? { ...o, hasGetMailNotification: checked } : o
      )
    );
  };

  if (status === 'unauthenticated') {
    signOut({ callbackUrl: '/signin' });
    return <div>Leite weiter…</div>;
  }

  if (isLoadingUser) {
    return <div>Lade Einstellungen…</div>;
  }

  if (!userData) {
    return <div>Keine Benutzerdaten gefunden.</div>;
  }

  return (
    <>
      {AlertDialogComponent}
      <div className="mx-auto flex w-full max-w-7xl flex-col rounded-lg bg-white outline outline-offset-1 outline-slate-200">
        <SettingsHeader
          onSave={handleSave}
          isSaving={mutation.isPending}
          onCancel={() => router.push('/')}
        />
        <div className="inline-flex items-start justify-start gap-4 self-stretch overflow-hidden py-4 pl-2">
          <OrganizationSidebar user={userData} onSignOut={signOut} />

          <div className="inline-flex flex-1 flex-col items-start justify-start gap-8">
            <AccountSection
              firstname={firstname}
              lastname={lastname}
              email={email}
              phone={phone}
              pictureUrl={pictureUrl}
              previewUrl={previewUrl}
              onFirstnameChange={setFirstname}
              onLastnameChange={setLastname}
              onEmailChange={setEmail}
              onPhoneChange={setPhone}
              onProfilePictureUpload={handleProfilePictureUpload}
              onRemoveProfilePicture={handleRemoveProfilePicture}
            />

            <PersonalPreferencesSection
              showLogos={showLogos}
              salutationId={salutationId}
              salutations={salutations}
              onShowLogosChange={setShowLogos}
              onSalutationChange={setSalutationId}
            />

            <NotificationsSection
              organizations={organizations}
              onNotificationChange={handleNotificationChange}
            />

            <OrganizationsSection
              organizations={organizations}
              onOrganizationLeave={handleOrganizationLeave}
            />
          </div>
        </div>
      </div>
    </>
  );
}
