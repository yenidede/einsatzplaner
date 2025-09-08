'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateUserSchema, CreateUserData, UserRoleSchema } from '@/types/user';
import Link from 'next/link';

export default function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm({

    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
        role: 'Helfer'
    }
  });

  const onSubmit: (data: CreateUserData) => Promise<void> = async (data) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (res.ok) {
        router.push('/dashboard?message=Registrierung erfolgreich');
      } else {
        const body = await res.json();
        setError(body.error || 'Registrierung fehlgeschlagen');
      }
    } catch (err) {
      setError('Netzwerkfehler. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Registrieren
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Oder{' '}
          <Link href="/signin" className="font-medium text-blue-600 hover:text-blue-500">
            hier anmelden, wenn Sie bereits ein Konto haben
          </Link>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-md shadow-sm -space-y-px">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-Mail
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

          <div className="mb-4">
            <label htmlFor="firstname" className="block text-sm font-medium text-gray-700 mb-1">
              Vorname
            </label>
            <input
              id="firstname"
              type="text"
              autoComplete="given-name"
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Vorname"
              {...register('firstname')}
            />
            {errors.firstname && (
              <p className="mt-1 text-sm text-red-600">{errors.firstname.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="lastname" className="block text-sm font-medium text-gray-700 mb-1">
              Nachname
            </label>
            <input
              id="lastname"
              type="text"
              autoComplete="family-name"
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Nachname"
              {...register('lastname')}
            />
            {errors.lastname && (
              <p className="mt-1 text-sm text-red-600">{errors.lastname.message}</p>
            )}
          </div>
          <div className="mb-4">
  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
    Telefonnummer
  </label>
  <input
    id="phone"
    type="text"
    autoComplete="tel"
    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
    placeholder="Telefonnummer"
    {...register('phone')}
  />
  {errors.phone && (
    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
  )}
</div>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Passwort"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Rolle
            </label>
            <select
              id="role"
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              {...register('role')}
            >
              {UserRoleSchema.options.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
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
            {isLoading ? 'Wird registriert...' : 'Registrieren'}
          </button>
        </div>
      </form>
    </div>
  );
}