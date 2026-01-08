import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export function useSessionSync() {
  const { update } = useSession();

  useEffect(() => {
    const handleSessionUpdate = () => {
      update();
    };

    window.addEventListener('session-update', handleSessionUpdate);

    return () => {
      window.removeEventListener('session-update', handleSessionUpdate);
    };
  }, [update]);
}
