'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { signIn } from 'next-auth/react';
import { Password } from '@/components/password';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  continueSelfServeSignup,
  type ContinueSelfServeSignupResult,
} from '../actions';
import type { SelfServeSignupAccountMode } from '../account-step';
import {
  existingAccountStepSchema,
  newAccountStepSchema,
  organizationStepSchema,
  type OrganizationStepValues,
} from '../schema';

type SignupStep = 'organization' | 'account' | 'review';

type SignupFormValues = OrganizationStepValues & {
  vorname: string;
  nachname: string;
  passwort: string;
  passwort2: string;
};

interface SelfServeSignupFlowProps {
  authenticatedEmail?: string | null;
  onContinue?: (values: OrganizationStepValues) => Promise<ContinueSelfServeSignupResult>;
  onAuthenticateExistingUser?: (values: {
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function SelfServeSignupFlow({
  authenticatedEmail,
  onContinue = continueSelfServeSignup,
  onAuthenticateExistingUser = async ({ email, password }) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    return {
      ok: !result?.error,
      error: result?.error ?? undefined,
    };
  },
}: SelfServeSignupFlowProps) {
  const [step, setStep] = useState<SignupStep>('organization');
  const [accountMode, setAccountMode] =
    useState<SelfServeSignupAccountMode | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isAuthenticated = Boolean(authenticatedEmail);

  const {
    register,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SignupFormValues>({
    defaultValues: {
      organizationName: '',
      organizationDescription: '',
      email: authenticatedEmail ?? '',
      vorname: '',
      nachname: '',
      passwort: '',
      passwort2: '',
    },
  });

  const organizationName = watch('organizationName');
  const organizationDescription = watch('organizationDescription');
  const email = watch('email');
  const firstName = watch('vorname');
  const lastName = watch('nachname');
  const password = watch('passwort');
  const passwordConfirmation = watch('passwort2');

  const clearAllErrors = () => {
    clearErrors();
    setServerError(null);
    setGeneralError(null);
  };

  const submitOrganizationStep = () => {
    const parsedValues = organizationStepSchema.safeParse({
      organizationName,
      organizationDescription,
      email: authenticatedEmail ?? email,
    });

    clearAllErrors();

    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const field = issue.path[0];

        if (
          field === 'organizationName' ||
          field === 'organizationDescription' ||
          field === 'email'
        ) {
          setError(field, {
            message: issue.message,
          });
        }
      }

      return;
    }

    startTransition(async () => {
      try {
        const result = await onContinue(parsedValues.data);

        if (result.status === 'unavailable') {
          setServerError(result.message);
          setError('organizationName', {
            message: result.message,
          });
          return;
        }

        setAccountMode(result.accountMode);

        if (result.accountMode === 'authenticated-user') {
          setStep('review');
          return;
        }

        setStep('account');
      } catch (error) {
        console.error('Self-serve signup continue failed:', error);
        setGeneralError(
          'Die Organisationsprüfung konnte gerade nicht durchgeführt werden. Bitte versuchen Sie es erneut.'
        );
      }
    });
  };

  const submitNewAccountStep = () => {
    const parsedValues = newAccountStepSchema.safeParse({
      email,
      vorname: firstName,
      nachname: lastName,
      passwort: password,
      passwort2: passwordConfirmation,
    });

    clearAllErrors();

    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const field = issue.path[0];

        if (
          field === 'email' ||
          field === 'vorname' ||
          field === 'nachname' ||
          field === 'passwort' ||
          field === 'passwort2'
        ) {
          setError(field, {
            message: issue.message,
          });
        }
      }

      return;
    }

    setStep('review');
  };

  const submitExistingAccountStep = () => {
    const parsedValues = existingAccountStepSchema.safeParse({
      email,
      passwort: password,
    });

    clearAllErrors();

    if (!parsedValues.success) {
      for (const issue of parsedValues.error.issues) {
        const field = issue.path[0];

        if (field === 'email' || field === 'passwort') {
          setError(field, {
            message: issue.message,
          });
        }
      }

      return;
    }

    startTransition(async () => {
      try {
        const result = await onAuthenticateExistingUser({
          email: parsedValues.data.email,
          password: parsedValues.data.passwort,
        });

        if (!result.ok) {
          setGeneralError(
            'Die Anmeldung mit Ihrem bestehenden Konto ist fehlgeschlagen. Bitte prüfen Sie Ihre Zugangsdaten.'
          );
          return;
        }

        setStep('review');
      } catch (error) {
        console.error('Existing account authentication failed:', error);
        setGeneralError(
          'Die Anmeldung mit Ihrem bestehenden Konto konnte gerade nicht durchgeführt werden. Bitte versuchen Sie es erneut.'
        );
      }
    });
  };

  const backButtonDisabled = step === 'organization' || isPending;
  const backTargetStep =
    step === 'review' && accountMode && accountMode !== 'authenticated-user'
      ? 'account'
      : 'organization';

  return (
    <Card className="border-white/70 bg-white/95 backdrop-blur">
      <CardHeader>
        <CardTitle>Organisation erstellen</CardTitle>
        <CardDescription>
          Starten Sie mit den Daten Ihrer Organisation. Der zweite Schritt passt
          sich anschließend serverseitig an Ihren Kontostatus an.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="grid gap-3 text-sm sm:grid-cols-3">
          <li
            className={`rounded-lg border px-4 py-3 ${
              step === 'organization'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            1. Organisation
          </li>
          <li
            className={`rounded-lg border px-4 py-3 ${
              step === 'account'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            2. Konto
          </li>
          <li
            className={`rounded-lg border px-4 py-3 ${
              step === 'review'
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            3. Fortsetzung
          </li>
        </ol>

        {generalError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {generalError}
          </div>
        ) : null}

        {step === 'organization' ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              submitOrganizationStep();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organisationsname</Label>
              <Input
                id="organizationName"
                placeholder="z. B. Musterverein Hohenems"
                aria-invalid={errors.organizationName ? true : undefined}
                {...register('organizationName')}
              />
              {errors.organizationName?.message ? (
                <p className="text-destructive text-sm">
                  {errors.organizationName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationDescription">Kurzbeschreibung</Label>
              <Textarea
                id="organizationDescription"
                rows={5}
                placeholder="Beschreiben Sie kurz, wofür Sie den Einsatzplaner nutzen möchten."
                {...register('organizationDescription')}
              />
              <p className="text-muted-foreground text-sm">
                Diese Angaben bleiben im Flow erhalten, wenn sich der nächste
                Schritt an Ihren Kontostatus anpasst.
              </p>
            </div>

            {isAuthenticated ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Sie sind bereits als <strong>{authenticatedEmail}</strong>{' '}
                angemeldet. Der Kontoschritt wird für Sie übersprungen.
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ihre@emailadresse.at"
                  aria-invalid={errors.email ? true : undefined}
                  {...register('email')}
                />
                {errors.email?.message ? (
                  <p className="text-destructive text-sm">
                    {errors.email.message}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Beim Fortfahren wird serverseitig geprüft, ob für diese
                    Adresse bereits ein Konto existiert.
                  </p>
                )}
              </div>
            )}

            {serverError ? (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                {serverError}
              </div>
            ) : null}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Flow wird geprüft...' : 'Weiter'}
            </Button>
          </form>
        ) : null}

        {step === 'account' && accountMode === 'new-account' ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              submitNewAccountStep();
            }}
          >
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Für <strong>{email}</strong> wurde noch kein Konto gefunden. Bitte
              vervollständigen Sie jetzt Ihre Registrierungsdaten.
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vorname">Vorname</Label>
                <Input id="vorname" {...register('vorname')} />
                {errors.vorname?.message ? (
                  <p className="text-destructive text-sm">
                    {errors.vorname.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nachname">Nachname</Label>
                <Input id="nachname" {...register('nachname')} />
                {errors.nachname?.message ? (
                  <p className="text-destructive text-sm">
                    {errors.nachname.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwort">Passwort</Label>
              <Password id="passwort" {...register('passwort')} />
              {errors.passwort?.message ? (
                <p className="text-destructive text-sm">
                  {errors.passwort.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwort2">Passwort bestätigen</Label>
              <Password id="passwort2" {...register('passwort2')} />
              {errors.passwort2?.message ? (
                <p className="text-destructive text-sm">
                  {errors.passwort2.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" className="w-full">
              Kontodaten übernehmen
            </Button>
          </form>
        ) : null}

        {step === 'account' && accountMode === 'existing-account' ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              submitExistingAccountStep();
            }}
          >
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Für <strong>{email}</strong> existiert bereits ein Konto. Bitte
              melden Sie sich mit Ihrem Passwort an, um mit diesem Konto
              fortzufahren.
            </div>

            <div className="space-y-2">
              <Label htmlFor="existingEmail">E-Mail-Adresse</Label>
              <Input id="existingEmail" value={email} readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="existingPassword">Passwort</Label>
              <Password id="existingPassword" {...register('passwort')} />
              {errors.passwort?.message ? (
                <p className="text-destructive text-sm">
                  {errors.passwort.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Anmeldung läuft...' : 'Mit bestehendem Konto fortfahren'}
            </Button>
          </form>
        ) : null}

        {step === 'review' ? (
          <div className="space-y-6">
            {accountMode === 'authenticated-user' ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Sie sind bereits angemeldet. Der Kontoschritt wurde übersprungen
                und Ihre Organisationsdaten bleiben für den nächsten Slice
                erhalten.
              </div>
            ) : null}

            {accountMode === 'existing-account' ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Ihr bestehendes Konto wurde bestätigt. Die Organisation kann im
                nächsten Schritt direkt diesem Konto zugeordnet werden.
              </div>
            ) : null}

            {accountMode === 'new-account' ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Ihre Registrierungsdaten sind vollständig. Die E-Mail-Bestätigung
                und das eigentliche Pending-Signup folgen im nächsten Signup-Slice.
              </div>
            ) : null}

            <div className="space-y-3 rounded-lg border p-4">
              <div>
                <p className="text-muted-foreground text-sm">
                  Organisationsname
                </p>
                <p className="font-medium">{organizationName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Kurzbeschreibung
                </p>
                <p className="whitespace-pre-wrap">
                  {organizationDescription || 'Keine Beschreibung angegeben'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">E-Mail-Adresse</p>
                <p className="font-medium">{authenticatedEmail ?? email}</p>
              </div>
              {accountMode === 'new-account' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-sm">Vorname</p>
                    <p className="font-medium">{firstName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Nachname</p>
                    <p className="font-medium">{lastName}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-dashed px-4 py-3 text-sm">
              Die eigentliche Erstellung der Organisation und die neue
              Kontofinalisierung folgen in den nachgelagerten Signup-Issues.
            </div>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStep(backTargetStep);
            clearAllErrors();
          }}
          disabled={backButtonDisabled}
        >
          Zurück
        </Button>
        <p className="text-muted-foreground text-right text-sm">
          Organisationsname und Kontomodus werden erst beim Fortfahren
          serverseitig geprüft.
        </p>
      </CardFooter>
    </Card>
  );
}
