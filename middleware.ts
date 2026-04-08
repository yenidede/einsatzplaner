import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { isPublicPath } from '@/lib/auth/public-paths';

export default withAuth(
  function middleware() {
    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/signin',
      error: '/signin',
    },
    callbacks: {
      // auto redirects to /signin if not a public page
      authorized: ({ req, token }) => {
        if (isPublicPath(req.nextUrl.pathname)) {
          return true;
        }

        return Boolean(token);
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
