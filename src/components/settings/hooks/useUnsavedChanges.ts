import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAlertDialog } from '@/contexts/AlertDialogContext';

interface UseUnsavedChangesOptions<T extends string = string> {
  hasUnsavedChanges: boolean;
  onSectionChange?: (section: T) => void;
}

export function useUnsavedChanges<T extends string = string>({
  hasUnsavedChanges,
  onSectionChange,
}: UseUnsavedChangesOptions<T>) {
  const router = useRouter();
  const pathname = usePathname();
  const { showDialog } = useAlertDialog();
  const isNavigatingRef = useRef(false);
  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);

  // Keep refs updated
  useEffect(() => {
    routerRef.current = router;
    pathnameRef.current = pathname;
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [router, pathname, hasUnsavedChanges]);

  // Intercept router.push calls - use a more reliable approach
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // Store original methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routerInstance = router as any;
    const originalPush = routerInstance.push?.bind(router) || router.push.bind(router);
    const originalReplace = routerInstance.replace?.bind(router) || router.replace.bind(router);

    const handleNavigation = async (url: string, navigationFn: typeof router.push): Promise<void> => {
      const currentPath = pathnameRef.current;
      const targetPath = url.split('#')[0].split('?')[0]; // Remove hash and query params

      // If it's the same path (just hash/query change), allow it
      if (targetPath === currentPath || targetPath === '' || !targetPath) {
        return navigationFn.call(router, url);
      }

      // Different route - show dialog
      const result = await showDialog({
        title: 'Ungespeicherte Änderungen',
        description:
          'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?',
      });

      if (result === 'success') {
        isNavigatingRef.current = true;
        try {
          await navigationFn.call(router, url);
        } finally {
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 100);
        }
      }
    };

    // Override router methods
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routerInstance.push = ((url: string, options?: any) => {
      if (isNavigatingRef.current || !hasUnsavedChangesRef.current) {
        return originalPush(url, options);
      }
      return handleNavigation(url, originalPush);
    }) as typeof router.push;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    routerInstance.replace = ((url: string, options?: any) => {
      if (isNavigatingRef.current || !hasUnsavedChangesRef.current) {
        return originalReplace(url, options);
      }
      const currentPath = pathnameRef.current;
      const targetPath = url.split('#')[0].split('?')[0];
      if (targetPath === currentPath || targetPath === '' || !targetPath) {
        return originalReplace(url, options);
      }
      return handleNavigation(url, originalReplace);
    }) as typeof router.replace;

    return () => {
      routerInstance.push = originalPush;
      routerInstance.replace = originalReplace;
    };
  }, [router, hasUnsavedChanges, showDialog, pathname]);

  // Intercept section changes
  const handleSectionChangeWithCheck = useCallback(
    async (section: T) => {
      if (!hasUnsavedChanges) {
        onSectionChange?.(section);
        return;
      }

      const result = await showDialog({
        title: 'Ungespeicherte Änderungen',
        description:
          'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich zu einem anderen Bereich wechseln?',
      });

      if (result === 'success') {
        onSectionChange?.(section);
      }
    },
    [hasUnsavedChanges, showDialog, onSectionChange]
  );

  // Handle browser back/forward
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Navigation guard function that can be used to intercept any navigation
  const navigateWithCheck = useCallback(
    async (url: string) => {
      if (!hasUnsavedChanges) {
        router.push(url);
        return;
      }

      const result = await showDialog({
        title: 'Ungespeicherte Änderungen',
        description:
          'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?',
      });

      if (result === 'success') {
        isNavigatingRef.current = true;
        try {
          await router.push(url);
        } finally {
          setTimeout(() => {
            isNavigatingRef.current = false;
          }, 100);
        }
      }
    },
    [hasUnsavedChanges, showDialog, router]
  );

  return {
    handleSectionChangeWithCheck,
    navigateWithCheck,
  };
}
