import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { ROLE_NAME_MAP } from '@/lib/auth/authGuard';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/signin');
  }

  const userRoleIds = session.user.roleIds || [];

  // Await searchParams
  const resolvedSearchParams = await searchParams;

  // Build search params string
  const params = new URLSearchParams();
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => params.append(key, v));
      } else {
        params.set(key, value);
      }
    }
  });
  const searchString = params.toString() ? `?${params.toString()}` : '';

  // Redirect based on highest available role
  if (
    userRoleIds.includes(ROLE_NAME_MAP['Superadmin']) ||
    userRoleIds.includes(ROLE_NAME_MAP['Einsatzverwaltung'])
  ) {
    redirect(`/einsatzverwaltung${searchString}`);
  } else if (userRoleIds.includes(ROLE_NAME_MAP['Helfer'])) {
    redirect(`/helferansicht${searchString}`);
  }

  // Fallback: if user has no recognized roles, redirect to helferansicht
  redirect(`/helferansicht${searchString}`);
}
