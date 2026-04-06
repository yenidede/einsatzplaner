'use client';

import { useState, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { continueSelfServeSignup } from '../actions';
import {
  organizationStepSchema,
  type OrganizationStepValues,
} from '../schema';
import type { OrganizationNameAvailabilityResult } from '../organization-step';

type SignupStep = 'organization' | 'account';

const defaultValues: OrganizationStepValues = {
  organizationName: '',
  organizationDescription: '',
};

interface SelfServeSignupFlowProps {
  onContinue?: (
    values: OrganizationStepValues
  ) => Promise<OrganizationNameAvailabilityResult>;
}

export function SelfServeSignupFlow({
  onContinue = continueSelfServeSignup,
}: SelfServeSignupFlowProps) {
  const [step, setStep] = useState<SignupStep>('organization');
  const [serverError, setServerError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<OrganizationStepValues>({
    resolver: zodResolver(organizationStepSchema),
    defaultValues,
  });

  const organizationName = watch('organizationName');
  const organizationDescription = watch('organizationDescription');

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    setGeneralError(null);
    clearErrors('organizationName');

    startTransition(async () => {
      try {
        const result = await onContinue(values);

        if (result.status === 'unavailable') {
          setServerError(result.message);
          setError('organizationName', {
            message: result.message,
          });
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
  });

  return (
    <Card className="border-white/70 bg-white/95 backdrop-blur">
      <CardHeader>
        <CardTitle>Organisation erstellen</CardTitle>
        <CardDescription>
          Starten Sie mit den Daten Ihrer Organisation. Im nächsten Schritt
          verknüpfen Sie anschließend Ihr Konto.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="grid gap-3 text-sm sm:grid-cols-2">
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
          <form className="space-y-6" onSubmit={onSubmit}>
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
              <Label htmlFor="organizationDescription">
                Kurzbeschreibung
              </Label>
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

            {serverError ? (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              >
                {serverError}
              </div>
            ) : null}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending
                ? 'Organisationsname wird geprüft...'
                : 'Weiter zur Konto-Prüfung'}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Ihr Organisationsname ist verfügbar. Ihre Angaben wurden für den
              nächsten Schritt übernommen.
            </div>

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
            </div>

            <div className="rounded-lg border border-dashed px-4 py-3 text-sm">
              Als Nächstes wird Ihr Konto mit der neuen Organisation
              verknüpft.
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between gap-3 border-t pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStep('organization');
            setGeneralError(null);
            setServerError(null);
          }}
          disabled={step === 'organization' || isPending}
        >
          Zurück
        </Button>
        <p className="text-muted-foreground text-right text-sm">
          Der Organisationsname wird erst beim Fortfahren serverseitig geprüft.
        </p>
      </CardFooter>
    </Card>
  );
}
