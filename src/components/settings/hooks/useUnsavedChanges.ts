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
  const skipNextPopStateRef = useRef(false);
  const hasHistoryGuardRef = useRef(false);

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
    const originalPush =
      routerInstance.push?.bind(router) || router.push.bind(router);
    const originalReplace =
      routerInstance.replace?.bind(router) || router.replace.bind(router);

    const handleNavigation = async (
      url: string,
      navigationFn: typeof router.push
    ): Promise<void> => {
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

    // Add a history entry so we can intercept a single back/forward action
    // without immediately leaving the page.
    const hasGuardInState =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Boolean((history.state as any)?.__unsavedChangesGuard);
    if (!hasGuardInState && !hasHistoryGuardRef.current) {
      // Preserve any existing history state (Next.js stores routing state here).
      const currentState =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (history.state as any) && typeof history.state === 'object'
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { ...(history.state as any), __unsavedChangesGuard: true }
          : { __unsavedChangesGuard: true };
      history.pushState(currentState, '', window.location.href);
      hasHistoryGuardRef.current = true;
    } else {
      hasHistoryGuardRef.current = true;
    }

    const handlePopState = async () => {
      // If we intentionally triggered the next pop (to allow navigation), don't block it.
      if (skipNextPopStateRef.current) {
        skipNextPopStateRef.current = false;
        return;
      }

      if (!hasUnsavedChangesRef.current) return;

      // Use existing confirmation flow when available
      const result = await showDialog({
        title: 'Ungespeicherte Änderungen',
        description:
          'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?',
      });

      if (result === 'success') {
        // Allow the pop to proceed: go back once more to leave the guard entry.
        skipNextPopStateRef.current = true;
        history.back();
      } else {
        // Revert navigation by restoring the current URL/state.
        const currentState =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (history.state as any) && typeof history.state === 'object'
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { ...(history.state as any), __unsavedChangesGuard: true }
            : { __unsavedChangesGuard: true };
        history.pushState(currentState, '', window.location.href);
        hasHistoryGuardRef.current = true;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, showDialog]);

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
