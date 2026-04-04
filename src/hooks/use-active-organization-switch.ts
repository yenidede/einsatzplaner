'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { updateActiveOrganizationAction } from '@/features/settings/settings-action';
import {
  getOrganizationSettingsHref,
  isOrganizationSettingsPath,
} from '@/components/settings/settings-navigation.utils';

type SwitchOrganizationOptions = {
  showSuccessToast?: boolean;
  syncSettingsRoute?: boolean;
};

export function useActiveOrganizationSwitch() {
  const { update: updateSession, data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isSwitching, setIsSwitching] = useState(false);

  const switchOrganization = useCallback(
    async (
      organizationId: string,
      options?: SwitchOrganizationOptions
    ): Promise<void> => {
      if (!session) {
        throw new Error('Organisation nicht gefunden');
      }

      const shouldShowSuccessToast = options?.showSuccessToast ?? true;
      const shouldSyncSettingsRoute =
        options?.syncSettingsRoute ?? isOrganizationSettingsPath(pathname);

      setIsSwitching(true);

      try {
        const result = await updateActiveOrganizationAction(organizationId);

        if (!result.success || !result.organization) {
          throw new Error(
            result.error ?? 'Die Organisation konnte nicht gewechselt werden.'
          );
        }

        await updateSession({
          user: {
            ...session.user,
            activeOrganization: result.organization,
          },
        });

        if (shouldSyncSettingsRoute) {
          router.push(getOrganizationSettingsHref(organizationId));
        }

        if (shouldShowSuccessToast) {
          toast.success(
            `Organisation erfolgreich zu ${result.organization.name} gewechselt.`
          );
        }
      } catch (error) {
        toast.error(
          `Fehler beim Wechseln der Organisation${error instanceof Error ? `: ${error.message}` : '.'}`
        );
        throw error;
      } finally {
        setIsSwitching(false);
      }
    },
    [pathname, router, session, updateSession]
  );

  return {
    isSwitching,
    switchOrganization,
  };
}
