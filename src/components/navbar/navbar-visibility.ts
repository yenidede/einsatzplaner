import { isPublicPath } from '@/lib/auth/public-paths';

export function shouldHideNavbar(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return pathname === '/subscription-expired' || isPublicPath(pathname);
}
