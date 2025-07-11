import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

export default withAuth({
    pages: {
        signIn: '/signin',
        error: '/signin',
    },
    secret: process.env.NEXTAUTH_SECRET,
});
export const config = {
    matcher: [
        // Match all paths except the ones listed below
        '/((?!api|_next/static|_next/image|favicon.ico|signin|signup).*)',
    ],
};
