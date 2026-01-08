'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { forgotPasswordAction } from '@/features/auth/actions';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);

    try {
      const result = await forgotPasswordAction({ email: data.email });

      if (result.success) {
        setEmailSent(true);
        toast.success(result.message);
      } else {
        toast.error(result.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 px-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">E-Mail gesendet</h1>
            <p className="text-muted-foreground mt-2">
              Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine
              E-Mail mit weiteren Anweisungen gesendet.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Überprüfen Sie auch Ihren Spam-Ordner.
            </p>
            <div className="mt-6 space-y-2">
              <Button onClick={() => router.push('/signin')} className="w-full">
                Zurück zur Anmeldung
              </Button>
              <Button
                variant="outline"
                onClick={() => setEmailSent(false)}
                className="w-full"
              >
                Erneut senden
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Passwort vergessen?</h1>
          <p className="text-muted-foreground mt-2">
            Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link
            zum Zurücksetzen Ihres Passworts.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Wird gesendet...' : 'Reset-Link senden'}
          </Button>

          <div className="text-center text-sm">
            <Link href="/signin" className="text-primary hover:underline">
              Zurück zur Anmeldung
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
