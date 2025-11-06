import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * Custom Hook: Synchronisiert Session nach Updates
 */
export function useSessionSync() {
  const { update } = useSession();

  useEffect(() => {
    // ✅ Event Listener für Session Updates
    const handleSessionUpdate = () => {
      console.log('🔄 Session update triggered');
      update();
    };

    window.addEventListener('session-update', handleSessionUpdate);

    return () => {
      window.removeEventListener('session-update', handleSessionUpdate);
    };
  }, [update]);
}