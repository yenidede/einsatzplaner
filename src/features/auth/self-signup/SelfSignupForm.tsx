'use client';

import { useQuery } from '@tanstack/react-query';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Verified,
} from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Controller, type FieldPath, useForm } from 'react-hook-form';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OTPCustom } from '@/components/OTPCustom';
import { Password } from '@/components/password';
import {
  FormFooter,
  FormHeader,
  MultiStepFormContent,
  MultiStepFormProvider,
  NextButton,
  PreviousButton,
  StepFields,
  SubmitButton,
} from '@/components/form/MultiStepForm';
import { useMultiStepForm } from '@/components/form/useMultiStepForm';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  createSelfSignupAction,
  getSelfSignupAccountStatusAction,
} from '@/features/auth/actions';
import { useOneTimePassword } from '@/features/auth/hooks/useOneTimePassword';
import { authQueryKeys } from '@/features/auth/queryKeys';
import {
  createFormSchema,
  selfSignupBaseSchema,
  type SelfSignupAccountMode,
  type SelfSignupFormValues,
} from '@/features/auth/self-signup/schema';

type SignupSchemaInput = SelfSignupFormValues;
type SignupSchemaOutput = z.output<typeof selfSignupBaseSchema>;

const isGeneratedFormField = (
  value: string
): value is FieldPath<SignupSchemaInput> => value in selfSignupBaseSchema.shape;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAccountStepFields(accountMode: SelfSignupAccountMode) {
  if (accountMode === 'logged_in') {
    return ['orga-name', 'orga-kuerzel'] as const;
  }

  if (accountMode === 'existing') {
    return [
      'orga-name',
      'orga-kuerzel',
      'user-email',
      'user-password',
    ] as const;
  }

  return [
    'orga-name',
    'orga-kuerzel',
    'user-vorname',
    'user-nachname',
    'user-email',
    'user-password',
    'user-passwort-confirm',
  ] as const;
}

const verificationStepFields = [] as const;

const profileStepFields = [
  'orga-phone',
  'orga-website',
  'privacy-consent',
  'orga-helfer-singular',
  'orga-helfer-plural',
  'orga-einsatz-singular',
  'orga-einsatz-plural',
] as const;

function RequiredLabel({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <>
      {label}
      {required ? <span className="text-destructive">*</span> : null}
    </>
  );
}

function TextField({
  control,
  name,
  label,
  required = false,
  placeholder,
  type = 'text',
  description,
  className,
}: {
  control: ReturnType<
    typeof useForm<SignupSchemaInput, unknown, SignupSchemaOutput>
  >['control'];
  name: FieldPath<SignupSchemaInput>;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: React.ComponentProps<typeof Input>['type'];
  description?: string;
  className?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field
          data-invalid={fieldState.invalid}
          className={className ?? 'gap-2'}
        >
          <FieldLabel htmlFor={name}>
            <RequiredLabel label={label} required={required} />
          </FieldLabel>
          <Input
            {...field}
            id={name}
            value={typeof field.value === 'string' ? field.value : ''}
            type={type}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
          />
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : null}
        </Field>
      )}
    />
  );
}

function PasswordField({
  control,
  name,
  label,
  required = false,
  placeholder,
}: {
  control: ReturnType<
    typeof useForm<SignupSchemaInput, unknown, SignupSchemaOutput>
  >['control'];
  name: FieldPath<SignupSchemaInput>;
  label: string;
  required?: boolean;
  placeholder: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="gap-2">
          <FieldLabel htmlFor={name}>
            <RequiredLabel label={label} required={required} />
          </FieldLabel>
          <Password
            {...field}
            id={name}
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={(event) => field.onChange(event.target.value)}
            aria-invalid={fieldState.invalid}
            placeholder={placeholder}
          />
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : null}
        </Field>
      )}
    />
  );
}

function StepHeading() {
  const { currentStepData, currentStepIndex } = useMultiStepForm();
  const isFirstStep = currentStepIndex === 1;

  if (!currentStepData.heading) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight">
        {currentStepData.heading}
      </h1>
      {isFirstStep ? (
        <p className="text-muted-foreground text-sm">
          Mit dieser Registrierung legen Sie eine neue Organisation an. Wenn Sie
          einer bestehenden Organisation beitreten möchten, wenden Sie sich
          bitte an Ihre Administratorin oder Ihren Administrator.
        </p>
      ) : null}
      {currentStepData.subheading ? (
        <p className="text-muted-foreground text-sm">
          {currentStepData.subheading}
        </p>
      ) : null}
    </div>
  );
}

function CheckboxField({
  control,
  name,
  label,
  description,
}: {
  control: ReturnType<
    typeof useForm<SignupSchemaInput, unknown, SignupSchemaOutput>
  >['control'];
  name: FieldPath<SignupSchemaInput>;
  label: string;
  description?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field
          data-invalid={fieldState.invalid}
          className="gap-2 md:col-span-2"
        >
          <div className="flex items-start gap-3">
            <Checkbox
              id={name}
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              aria-invalid={fieldState.invalid}
            />
            <div className="space-y-1">
              <FieldLabel htmlFor={name} className="cursor-pointer">
                <RequiredLabel label={label} required />
              </FieldLabel>
              {description ? (
                <FieldDescription>{description}</FieldDescription>
              ) : null}
            </div>
          </div>
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : null}
        </Field>
      )}
    />
  );
}

function AutoAdvanceAfterOtpVerification({
  isVerified,
  isVerifying,
}: {
  isVerified: boolean;
  isVerifying: boolean;
}) {
  const { currentStepIndex, goToNext } = useMultiStepForm();
  const previousIsVerifiedRef = useRef(isVerified);

  useEffect(() => {
    const verificationJustCompleted =
      !previousIsVerifiedRef.current && isVerified;

    previousIsVerifiedRef.current = isVerified;

    if (currentStepIndex !== 2 || !verificationJustCompleted || isVerifying) {
      return;
    }

    void goToNext();
  }, [currentStepIndex, goToNext, isVerified, isVerifying]);

  return null;
}

function AccountModeNotice({
  accountMode,
  sessionEmail,
}: {
  accountMode: SelfSignupAccountMode;
  sessionEmail: string;
}) {
  if (accountMode === 'logged_in') {
    return (
      <div className="bg-primary/5 border-primary/15 text-foreground rounded-2xl border px-4 py-3 md:col-span-2">
        <p className="text-sm font-medium">
          Sie sind bereits als {sessionEmail} angemeldet.
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Für diese Registrierung benötigen wir deshalb weder Ihre
          E-Mail-Adresse noch ein Passwort erneut.
        </p>
      </div>
    );
  }

  if (accountMode === 'existing') {
    return (
      <div className="bg-primary/5 border-primary/15 text-foreground rounded-2xl border px-4 py-3 md:col-span-2">
        <p className="text-sm font-medium">
          Zu dieser E-Mail-Adresse existiert bereits ein Konto.
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          Bitte melden Sie sich mit Ihrem bestehenden Passwort an. Ein neues
          Passwort müssen Sie hier nicht erstellen.
        </p>
      </div>
    );
  }

  return null;
}

function AccountFields({
  accountMode,
  control,
  sessionEmail,
}: {
  accountMode: SelfSignupAccountMode;
  control: ReturnType<
    typeof useForm<SignupSchemaInput, unknown, SignupSchemaOutput>
  >['control'];
  sessionEmail: string;
}) {
  return (
    <>
      <TextField
        className="gap-2"
        control={control}
        label="Name Ihrer Organisation"
        name="orga-name"
        placeholder="Jüdisches Museum Hohenems"
        required
      />
      <TextField
        className="gap-2"
        control={control}
        label="Kürzel Ihrer Organisation"
        name="orga-kuerzel"
        placeholder="JMH"
        description="Kurze interne Bezeichnung, zum Beispiel für Listen, Kalender oder Abkürzungen."
      />
      <FieldSeparator className="md:col-span-2" />
      <div className="flex flex-col gap-1 md:col-span-2">
        <div className="text-lg font-medium">Ihr Zugang</div>
        <p className="text-muted-foreground text-sm">
          {accountMode === 'new'
            ? 'Daraus wird Ihr persönlicher Account erstellt, mit dem Sie sich künftig anmelden.'
            : 'Wir verknüpfen Ihre neue Organisation mit Ihrem bestehenden Zugang.'}
        </p>
      </div>
      <AccountModeNotice
        accountMode={accountMode}
        sessionEmail={sessionEmail}
      />
      {accountMode === 'new' ? (
        <>
          <TextField
            control={control}
            label="Ihr Vorname"
            name="user-vorname"
            placeholder="David"
            description="Vorname der Person, die das Konto für Ihre Organisation anlegt."
            required
          />
          <TextField
            control={control}
            label="Ihr Nachname"
            name="user-nachname"
            placeholder="Kathrein"
            description="Nachname der Person, die das Konto für Ihre Organisation anlegt."
            required
          />
        </>
      ) : null}
      {accountMode !== 'logged_in' ? (
        <TextField
          className="gap-2 md:col-span-2"
          control={control}
          label="Ihre E-Mail-Adresse"
          name="user-email"
          placeholder="ihre@emailadresse.at"
          description="An diese Adresse senden wir bei neuen Konten den Bestätigungscode und wichtige Informationen zu Ihrem Konto."
          required
          type="email"
        />
      ) : null}
      {accountMode === 'new' ? (
        <>
          <PasswordField
            control={control}
            label="Passwort für Ihr Konto"
            name="user-password"
            placeholder="Mindestens 8 Zeichen"
            required
          />
          <PasswordField
            control={control}
            label="Passwort erneut eingeben"
            name="user-passwort-confirm"
            placeholder="Bitte wiederholen Sie Ihr Passwort"
            required
          />
        </>
      ) : null}
      {accountMode === 'existing' ? (
        <PasswordField
          control={control}
          label="Ihr bestehendes Passwort"
          name="user-password"
          placeholder="Bitte geben Sie Ihr Passwort ein"
          required
        />
      ) : null}
    </>
  );
}

export function SelfSignupForm() {
  const router = useRouter();
  const {
    data: session,
    status: sessionStatus,
    update: updateSession,
  } = useSession();
  const sessionEmail = session?.user?.email ?? '';
  const [submitErrorMessage, setSubmitErrorMessage] = useState('');
  const [isAdvancingToVerificationStep, setIsAdvancingToVerificationStep] =
    useState(false);
  const [otpRequestedForEmail, setOtpRequestedForEmail] = useState('');
  const form = useForm<SignupSchemaInput, unknown, SignupSchemaOutput>({
    resolver: zodResolver(selfSignupBaseSchema),
    defaultValues: {
      'orga-name': '',
      'orga-kuerzel': '',
      'orga-phone': '',
      'orga-website': '',
      'orga-helfer-plural': '',
      'orga-helfer-singular': '',
      'orga-einsatz-singular': '',
      'orga-einsatz-plural': '',
      'privacy-consent': false,
      'user-email': '',
      'user-nachname': '',
      'user-password': '',
      'user-passwort-confirm': '',
      'user-vorname': '',
    },
  });

  const {
    control,
    formState: { isSubmitting },
    getValues,
    handleSubmit,
    setError,
    watch,
    trigger,
  } = form;
  const email = watch('user-email') ?? '';
  const normalizedEmail = email.trim().toLowerCase();
  const isLoggedIn = sessionStatus === 'authenticated';
  const shouldCheckAccountStatus =
    !isLoggedIn && isValidEmail(normalizedEmail) && sessionStatus !== 'loading';
  const accountStatusQuery = useQuery({
    queryKey: authQueryKeys.selfSignup.accountStatus(normalizedEmail),
    enabled: shouldCheckAccountStatus,
    queryFn: async () => {
      const result = await getSelfSignupAccountStatusAction({
        email: normalizedEmail,
      });

      if (!result?.data) {
        throw new Error(
          result?.serverError ?? 'Der Kontostatus konnte nicht geprüft werden.'
        );
      }

      return result.data;
    },
    staleTime: 60_000,
  });

  const accountMode: SelfSignupAccountMode = isLoggedIn
    ? 'logged_in'
    : accountStatusQuery.data?.accountExists
      ? 'existing'
      : 'new';
  const hasVerificationStep = accountMode === 'new';
  const accountStepFields = getAccountStepFields(accountMode);
  const oneTimePassword = useOneTimePassword({
    email,
    enabled: hasVerificationStep,
    autoSend: false,
    codeLength: 6,
  });

  useEffect(() => {
    form.clearErrors();
  }, [accountMode, form]);

  useEffect(() => {
    if (otpRequestedForEmail && otpRequestedForEmail !== normalizedEmail) {
      setOtpRequestedForEmail('');
    }
  }, [normalizedEmail, otpRequestedForEmail]);

  const steps = useMemo(() => {
    const accountStep = {
      title: 'Ihre Angaben',
      heading: 'Registrierung',
      icon: <Building2 className="size-4" />,
      fields: [...accountStepFields],
      component: (
        <AccountFields
          accountMode={accountMode}
          control={control}
          sessionEmail={sessionEmail}
        />
      ),
    };

    const optionalStep = {
      title: 'Optional',
      heading: 'Weitere Angaben',
      icon: <Check className="size-4" />,
      fields: [...profileStepFields],
      component: (
        <>
          <TextField
            control={control}
            description="So nennen Sie Personen, die Einsätze übernehmen, zum Beispiel Helfer:in, Trainer:in oder Vermittler:in."
            label="Bezeichnung für mitwirkende Personen (Singular)"
            name="orga-helfer-singular"
            placeholder="Helfer:in, Trainer:in oder Vermittler:in"
          />
          <TextField
            control={control}
            description="So nennen Sie Personen, die Einsätze übernehmen, zum Beispiel Helfer:innen, Trainer:innen oder Vermittler:innen."
            label="Bezeichnung für mitwirkende Personen (Plural)"
            name="orga-helfer-plural"
            placeholder="Helfer:innen, Trainer:innen oder Vermittler:innen"
          />
          <TextField
            control={control}
            description="So nennen Sie Termine, Workshops oder Einsätze in Ihrer Organisation."
            label="Bezeichnung für einen Termin oder Einsatz (Singular)"
            name="orga-einsatz-singular"
            placeholder="Workshop, Training oder Führung"
          />
          <TextField
            control={control}
            description="So nennen Sie Termine, Workshops oder Einsätze in Ihrer Organisation."
            label="Bezeichnung für Termine oder Einsätze (Plural)"
            name="orga-einsatz-plural"
            placeholder="Workshops, Trainings oder Führungen"
          />
          <TextField
            className="gap-2"
            control={control}
            label="Telefonnummer der Organisation"
            name="orga-phone"
            placeholder="+43 123 456789"
            description="Optional für Rückfragen Ihrer Mitarbeiter oder für die Anzeige in Dokumenten und E-Mails."
            type="tel"
          />
          <TextField
            className="gap-2"
            control={control}
            label="Website der Organisation"
            name="orga-website"
            placeholder="https://www.beispiel.at"
            description="Optional, falls Ihre Organisation bereits eine öffentliche Website hat."
          />
          <CheckboxField
            control={control}
            label="Ich habe die Datenschutzerklärung gelesen und stimme ihr zu."
            name="privacy-consent"
            description="Diese Zustimmung ist erforderlich, damit Sie die Registrierung abschließen können."
          />
          <div className="bg-primary/5 text-foreground border-primary/15 mt-2 rounded-2xl border px-4 py-3 md:col-span-2">
            <p className="text-sm font-medium">
              Mit Ihrer Registrierung startet eine kostenlose 14-tägige
              Testphase.
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Diese Testphase wird innerhalb der Entwicklungsphase automatisch
              auf unbestimmte Zeit verlängert.
            </p>
          </div>
        </>
      ),
    };

    if (!hasVerificationStep) {
      return [accountStep, optionalStep];
    }

    return [
      accountStep,
      {
        title: 'Verifizierung',
        heading: 'E-Mail bestätigen',
        icon: <Verified className="size-4" />,
        fields: [...verificationStepFields],
        component: (
          <Field
            data-invalid={!!oneTimePassword.errorMessage}
            className="gap-3 md:col-span-2 md:max-w-md"
          >
            <FieldContent className="gap-1">
              <FieldLabel htmlFor="otp-e72">
                <RequiredLabel label="Bestätigungscode" required />
              </FieldLabel>
              <FieldDescription>
                Sobald Sie diesen Schritt öffnen, senden wir einen 6-stelligen
                Code an Ihre E-Mail-Adresse. Bitte geben Sie ihn hier ein.
              </FieldDescription>
            </FieldContent>
            <OTPCustom
              id="otp-e72"
              ariaInvalid={!!oneTimePassword.errorMessage}
              length={6}
              pattern={/\d/}
              value={oneTimePassword.code}
              onChange={oneTimePassword.setCode}
              separatorAfter={[2]}
            />
            <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              {oneTimePassword.isSending ? (
                <span>Bestätigungscode wird gesendet ...</span>
              ) : null}
              {oneTimePassword.isVerifying ? (
                <span>Code wird geprüft ...</span>
              ) : null}
              {oneTimePassword.isVerified ? (
                <span className="text-emerald-700">
                  Ihre E-Mail-Adresse wurde erfolgreich bestätigt.
                </span>
              ) : null}
              {!oneTimePassword.isVerified &&
              !oneTimePassword.isSending &&
              !oneTimePassword.isVerifying &&
              email.trim() ? (
                <span>
                  Bitte geben Sie den Code aus Ihrer E-Mail ein, um
                  fortzufahren.
                </span>
              ) : null}
            </div>
            {!oneTimePassword.canResend ? (
              <FieldDescription>
                Sie können in {oneTimePassword.resendRemainingSeconds} Sekunden
                einen neuen Code anfordern.
              </FieldDescription>
            ) : (
              <FieldDescription>
                Kein Code angekommen? Sie können jetzt einen neuen Code
                anfordern.
              </FieldDescription>
            )}
            <button
              className="text-primary inline-flex w-fit items-center text-sm font-medium underline underline-offset-4 disabled:no-underline"
              type="button"
              disabled={!oneTimePassword.canResend || oneTimePassword.isSending}
              onClick={() => {
                void oneTimePassword.resend();
              }}
            >
              Code erneut senden
            </button>
            {oneTimePassword.errorMessage ? (
              <FieldError
                errors={[{ message: oneTimePassword.errorMessage }]}
              />
            ) : null}
          </Field>
        ),
      },
      optionalStep,
    ];
  }, [
    accountMode,
    accountStepFields,
    control,
    email,
    hasVerificationStep,
    oneTimePassword.canResend,
    oneTimePassword.code,
    oneTimePassword.errorMessage,
    oneTimePassword.isSending,
    oneTimePassword.isVerified,
    oneTimePassword.isVerifying,
    oneTimePassword.resend,
    oneTimePassword.resendRemainingSeconds,
    oneTimePassword.setCode,
    sessionEmail,
  ]);

  const onSubmit = handleSubmit(async (data: SignupSchemaOutput) => {
    setSubmitErrorMessage('');

    let result: Awaited<ReturnType<typeof createSelfSignupAction>> | undefined;

    if (accountMode === 'new') {
      const parsed = createFormSchema('new').safeParse(data);
      if (!parsed.success) {
        return;
      }

      if (!oneTimePassword.isVerified || !oneTimePassword.challengeId) {
        setSubmitErrorMessage(
          'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse mit dem Bestätigungscode.'
        );
        return;
      }

      const firstName = parsed.data['user-vorname'];
      const lastName = parsed.data['user-nachname'];
      const signupEmail = parsed.data['user-email'];
      const signupPassword = parsed.data['user-password'];

      if (!firstName || !lastName || !signupEmail || !signupPassword) {
        setSubmitErrorMessage(
          'Die Registrierungsdaten sind unvollständig. Bitte prüfen Sie Ihre Angaben.'
        );
        return;
      }

      result = await createSelfSignupAction({
        accountMode: 'new',
        organizationName: parsed.data['orga-name'],
        organizationAbbreviation: parsed.data['orga-kuerzel'] || undefined,
        organizationPhone: parsed.data['orga-phone'] || undefined,
        organizationWebsite: parsed.data['orga-website'] || undefined,
        helperSingular: parsed.data['orga-helfer-singular'] || undefined,
        helperPlural: parsed.data['orga-helfer-plural'] || undefined,
        einsatzSingular: parsed.data['orga-einsatz-singular'] || undefined,
        einsatzPlural: parsed.data['orga-einsatz-plural'] || undefined,
        firstName,
        lastName,
        email: signupEmail,
        password: signupPassword,
        challengeId: oneTimePassword.challengeId,
      });
    } else if (accountMode === 'existing') {
      const parsed = createFormSchema('existing').safeParse(data);
      if (!parsed.success) {
        return;
      }

      const signupEmail = parsed.data['user-email'];
      const signupPassword = parsed.data['user-password'];

      if (!signupEmail || !signupPassword) {
        setSubmitErrorMessage(
          'Bitte geben Sie Ihre E-Mail-Adresse und Ihr Passwort ein.'
        );
        return;
      }

      result = await createSelfSignupAction({
        accountMode: 'existing',
        organizationName: parsed.data['orga-name'],
        organizationAbbreviation: parsed.data['orga-kuerzel'] || undefined,
        organizationPhone: parsed.data['orga-phone'] || undefined,
        organizationWebsite: parsed.data['orga-website'] || undefined,
        helperSingular: parsed.data['orga-helfer-singular'] || undefined,
        helperPlural: parsed.data['orga-helfer-plural'] || undefined,
        einsatzSingular: parsed.data['orga-einsatz-singular'] || undefined,
        einsatzPlural: parsed.data['orga-einsatz-plural'] || undefined,
        email: signupEmail,
        password: signupPassword,
      });
    } else {
      const parsed = createFormSchema('logged_in').safeParse(data);
      if (!parsed.success) {
        return;
      }

      result = await createSelfSignupAction({
        accountMode: 'logged_in',
        organizationName: parsed.data['orga-name'],
        organizationAbbreviation: parsed.data['orga-kuerzel'] || undefined,
        organizationPhone: parsed.data['orga-phone'] || undefined,
        organizationWebsite: parsed.data['orga-website'] || undefined,
        helperSingular: parsed.data['orga-helfer-singular'] || undefined,
        helperPlural: parsed.data['orga-helfer-plural'] || undefined,
        einsatzSingular: parsed.data['orga-einsatz-singular'] || undefined,
        einsatzPlural: parsed.data['orga-einsatz-plural'] || undefined,
      });
    }

    if (!result?.data?.success) {
      setSubmitErrorMessage(
        result?.serverError ??
          'Die Registrierung konnte nicht abgeschlossen werden.'
      );
      return;
    }

    if (accountMode === 'logged_in') {
      if (!session?.user) {
        setSubmitErrorMessage(
          'Ihre Sitzung konnte nicht aktualisiert werden. Bitte laden Sie die Seite neu.'
        );
        return;
      }

      await updateSession({
        user: session.user,
      });
      router.push('/');
      return;
    }

    const signInResult = await signIn('credentials', {
      email: data['user-email'],
      password: data['user-password'],
      redirect: true,
      callbackUrl: '/',
    });

    if (signInResult?.error) {
      setSubmitErrorMessage(
        'Ihr Konto wurde erstellt, aber die automatische Anmeldung ist fehlgeschlagen.'
      );
    }
  });

  return (
    <form
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-white px-6 py-6 shadow-sm md:px-10 md:py-8"
      onSubmit={onSubmit}
    >
      <MultiStepFormProvider
        stepsFields={steps}
        onStepValidation={async (step) => {
          if (step.title === 'Ihre Angaben') {
            setSubmitErrorMessage('');

            const stepFields = step.fields.filter(isGeneratedFormField);
            const isBaseValid = await trigger(stepFields);

            const modeValidation =
              createFormSchema(accountMode).safeParse(getValues());
            const stepSpecificIssues = !modeValidation.success
              ? modeValidation.error.issues.filter((issue) => {
                  const path = issue.path[0];
                  return (
                    typeof path === 'string' &&
                    isGeneratedFormField(path) &&
                    stepFields.includes(path)
                  );
                })
              : [];

            if (stepSpecificIssues.length > 0) {
              for (const issue of stepSpecificIssues) {
                const path = issue.path[0];

                if (
                  typeof path === 'string' &&
                  isGeneratedFormField(path) &&
                  stepFields.includes(path)
                ) {
                  setError(path, {
                    type: 'manual',
                    message: issue.message,
                  });
                }
              }
            }

            if (!isBaseValid || stepSpecificIssues.length > 0) {
              return false;
            }

            if (
              shouldCheckAccountStatus &&
              (accountStatusQuery.isFetching || !accountStatusQuery.isFetched)
            ) {
              return false;
            }

            if (
              hasVerificationStep &&
              !oneTimePassword.isVerified &&
              otpRequestedForEmail !== normalizedEmail
            ) {
              setIsAdvancingToVerificationStep(true);
              try {
                const sendResult = await oneTimePassword.send();

                if (sendResult) {
                  setOtpRequestedForEmail(normalizedEmail);
                }
              } finally {
                setIsAdvancingToVerificationStep(false);
              }
            }

            return true;
          }

          if (step.title === 'Verifizierung') {
            if (oneTimePassword.isVerified) {
              return true;
            }

            setError('user-email', {
              type: 'manual',
              message:
                'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse mit dem Bestätigungscode.',
            });
            return false;
          }

          const stepFields = step.fields.filter(isGeneratedFormField);
          return trigger(stepFields);
        }}
      >
        <MultiStepFormContent className="gap-4">
          {hasVerificationStep ? (
            <AutoAdvanceAfterOtpVerification
              isVerified={oneTimePassword.isVerified}
              isVerifying={oneTimePassword.isVerifying}
            />
          ) : null}
          <FormHeader />
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
            <StepHeading />
            <StepFields />
            {submitErrorMessage ? (
              <div className="text-destructive mt-4 text-sm">
                {submitErrorMessage}
              </div>
            ) : null}
          </div>
          <FormFooter>
            <div className="ml-auto flex items-center justify-end gap-3">
              <PreviousButton
                className="bg-muted text-muted-foreground hover:bg-muted h-9 rounded-xl border-0 px-4 py-2 shadow-none"
                variant="ghost"
              >
                <ChevronLeft />
                Zurück
              </PreviousButton>
              <NextButton
                className="h-9 rounded-xl px-5"
                size="default"
                disabled={
                  isAdvancingToVerificationStep ||
                  (shouldCheckAccountStatus &&
                    (accountStatusQuery.isLoading ||
                      accountStatusQuery.isFetching))
                }
              >
                {isAdvancingToVerificationStep
                  ? 'E-Mail wird gesendet ...'
                  : shouldCheckAccountStatus &&
                      (accountStatusQuery.isLoading ||
                        accountStatusQuery.isFetching)
                    ? 'Konto wird geprüft ...'
                    : 'Weiter'}
                <ChevronRight />
              </NextButton>
              <SubmitButton
                className="h-9 rounded-xl px-5"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Wird verarbeitet ...'
                  : 'Registrierung abschließen'}
              </SubmitButton>
            </div>
          </FormFooter>
        </MultiStepFormContent>
      </MultiStepFormProvider>
    </form>
  );
}
