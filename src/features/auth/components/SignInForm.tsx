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

  if (searchParams == null) {
    console.error('Search parameters are null');
    return <div>Error: Unable to retrieve search parameters.</div>;
    
  }
  const message = searchParams.get('message');

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginData>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginData) {
    setError(null);
    setIsLoading(true);
    
    try {
      console.log('Attempting sign in with:', { email: data.email });
      
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: '/helferansicht'
      });

      console.log('Sign in result:', result);

      if (result?.error) {
        console.error('Sign in error:', result.error);
        setError('E-Mail oder Passwort ist falsch');
      } else if (result?.ok) {
        console.log('Sign in successful, redirecting to dashboard...');
        
        // Warten auf Session-Update
        await new Promise(resolve => setTimeout(resolve, 100));
        
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

  // Alternative Methode für den Fall, dass die obige nicht funktioniert
  async function onSubmitWithRedirect(data: LoginData) {
    setError(null);
    setIsLoading(true);
    
    try {
      // Direkter Redirect mit NextAuth
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        callbackUrl: '/helferansicht',
        redirect: true
      });
    } catch (err) {
      console.error('Sign in exception:', err);
      setError('Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Anmelden
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Oder{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            hier registrieren, wenn Sie noch kein Konto haben
          </Link>
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-md shadow-sm space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="E-Mail"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Passwort"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm">
            <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
              Passwort vergessen?
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}