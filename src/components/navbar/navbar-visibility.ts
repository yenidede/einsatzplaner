export function shouldHideNavbar(pathname: string | null): boolean {
  return pathname === '/subscription-expired';
}
