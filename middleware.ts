import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { ROLE_NAME_MAP } from '@/lib/auth/authGuard';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const searchParams = req.nextUrl.search;

    // Only redirect from root path
    if (pathname === '/') {
      const userRoles = (token?.roleIds as string[]) || [];

      // Redirect based on highest available role
      if (
        userRoles.includes(ROLE_NAME_MAP['Superadmin']) ||
        userRoles.includes(ROLE_NAME_MAP['Einsatzverwaltung'])
      ) {
        return NextResponse.redirect(
          new URL(`/einsatzverwaltung${searchParams}`, req.url)
        );
      } else if (userRoles.includes(ROLE_NAME_MAP['Helfer'])) {
        return NextResponse.redirect(
          new URL(`/helferansicht${searchParams}`, req.url)
        );
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/signin',
      error: '/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: [
    // Match all paths except the ones listed below
    '/((?!api|_next/static|_next/image|favicon.ico|signin|signup).*)',
  ],
};
