import { useRouter } from 'next/navigation';
import { useSessionValidation } from '@/hooks/useSessionValidation';

export function useSettingsSessionValidation() {
  const router = useRouter();

  useSessionValidation({
    debug: false,
    onTokenExpired: () => {
      router.push('/signin');
    },
  });
}
