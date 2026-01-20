'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { LoginSchema, LoginData } from '@/types/user';
import Link from 'next/link';

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(LoginSchema),
  });

  if (searchParams == null) {
    console.error('Search parameters are null');
    return <div>Error: Unable to retrieve search parameters.</div>;
  }
  const message = searchParams.get('message');

  async function redirectOnSubmit(data: LoginData) {
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: '/helferansicht',
      });

      if (result?.error) {
        console.error('Sign in error:', result.error);
        setError('E-Mail oder Passwort ist falsch');
      } else if (result?.ok) {
        // Warten auf Session-Update
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Redirect mit Next.js Router
        router.push('/helferansicht');

        // Fallback für schwierige Fälle
        setTimeout(() => {
          if (window.location.pathname !== '/helferansicht') {
            window.location.replace('/helferansicht');
          }
        }, 1000);
      } else {
        console.warn('Unexpected sign in result:', result);
        setError('Anmeldung fehlgeschlagen. Unerwartete Antwort.');
      }
    } catch (err) {
      console.error('Sign in exception:', err);
      setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Anmelden</h2>
        <p className="mt-2 text-sm text-gray-600">
          Oder{' '}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            hier registrieren, wenn Sie noch kein Konto haben
          </Link>
        </p>
      </div>

      {message && (
        <div
          className="relative rounded border border-green-400 bg-green-50 px-4 py-3 text-green-700"
          role="alert"
        >
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      {error && (
        <div
          className="relative rounded border border-red-400 bg-red-50 px-4 py-3 text-red-700"
          role="alert"
        >
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form
        className="mt-8 space-y-6"
        onSubmit={handleSubmit(redirectOnSubmit)}
      >
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="relative block w-full appearance-none rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
              placeholder="E-Mail"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="relative block w-full appearance-none rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
              placeholder="Passwort"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
              isLoading ? 'cursor-not-allowed opacity-70' : ''
            }`}
          >
            {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <Link
              href="/forgot-password"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Passwort vergessen?
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
