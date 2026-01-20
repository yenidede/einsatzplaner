import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

type PageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params?.token;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Laden...
        </div>
      }
    >
      <ResetPasswordClient token={token} />
    </Suspense>
  );
}
