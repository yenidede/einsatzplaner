import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware() {
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
