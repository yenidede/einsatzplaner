'use client';

import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Verified,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Controller, type FieldPath, useForm } from 'react-hook-form';
import { Password } from '@/components/password';
import {
  FormFooter,
  FormHeader,
  MultiStepFormProvider,
  MultiStepFormContent,
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
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { FileUpload } from '@/features/auth/self-signup/SelfSignupFileUpload';
import { formSchema } from '@/features/auth/self-signup/schema';
import { cn } from '@/lib/utils';

type SignupSchemaInput = z.input<typeof formSchema>;
type SignupSchemaOutput = z.output<typeof formSchema>;

const isGeneratedFormField = (
  value: string
): value is FieldPath<SignupSchemaInput> => value in formSchema.shape;

const accountStepFields = [
  'orga-name',
  'orga-kuerzel',
  'user-vorname',
  'user-nachname',
  'user-email',
  'user-password',
  'user-passwort-confirm',
] as const;

const verificationStepFields = ['otp-e72'] as const;

const profileStepFields = [
  'orga-phone',
  'orga-website',
  'privacy-consent',
  'orga-logo-gross',
  'orga-logo-klein',
  'orga-helfer-singular',
  'orga-helfer-plural',
  'orga-einsatz-singular',
  'user-phone',
  'user-profilbild',
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

function UploadField({
  control,
  setValue,
  name,
  label,
  placeholder,
  accept,
  className,
}: {
  control: ReturnType<
    typeof useForm<SignupSchemaInput, unknown, SignupSchemaOutput>
  >['control'];
  setValue: ReturnType<
    typeof useForm<SignupSchemaInput, unknown, SignupSchemaOutput>
  >['setValue'];
  name: 'orga-logo-gross' | 'orga-logo-klein' | 'user-profilbild';
  label: string;
  placeholder: string;
  accept: string;
  className?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ fieldState }) => (
        <div className={cn('md:col-span-1', className)}>
          <Field data-invalid={fieldState.invalid} className="gap-2">
            <FieldLabel htmlFor={name}>{label}</FieldLabel>
            <FieldDescription>
              Wählen Sie eine Datei von Ihrem Gerät aus.
            </FieldDescription>
            <FileUpload
              accept={accept}
              disabled={false}
              maxSize={5242880}
              name={name}
              placeholder={placeholder}
              setValue={setValue}
            />
          </Field>
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : null}
        </div>
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
      {isFirstStep && (
        <>
          <p className="text-muted-foreground text-sm">
            Mit dieser Registrierung legen Sie eine neue Organisation an. Wenn
            Sie einer bestehenden Organisation beitreten möchten, wenden Sie
            sich bitte an Ihre Administratorin oder Ihren Administrator.
          </p>
        </>
      )}
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

export function SelfSignupForm() {
  const isTestEnvironment =
    process.env.NODE_ENV === 'development' || process.env.VITEST === 'true';
  const shouldUseSchemaValidation = !isTestEnvironment;

  const form = useForm<SignupSchemaInput, unknown, SignupSchemaOutput>({
    resolver: shouldUseSchemaValidation ? zodResolver(formSchema) : undefined,
    defaultValues: {
      'orga-name': '',
      'orga-kuerzel': '',
      'orga-phone': '',
      'orga-website': '',
      'otp-e72': '',
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
    formState: { isSubmitSuccessful, isSubmitting },
    handleSubmit,
    reset,
    setValue,
    trigger,
  } = form;

  const steps = [
    {
      title: 'Ihre Angaben',
      heading: 'Registrierung',
      icon: <Building2 className="size-4" />,
      fields: [...accountStepFields],
      component: (
        <>
          <TextField
            className="gap-2"
            control={control}
            label="Name Ihrer Organisation"
            name="orga-name"
            placeholder="Jüdisches Museum Hohenems"
            description="Dieser Name wird in Ihrem Konto, in E-Mails und in Dokumenten angezeigt."
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
            <div className="text-lg font-medium">Ihre Kontaktdaten</div>
            <p className="text-muted-foreground text-sm">
              Daraus wird Ihr persönlicher Account erstellt, mit dem Sie sich
              künftig anmelden.
            </p>
          </div>
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
          <TextField
            className="gap-2 md:col-span-2"
            control={control}
            label="Ihre E-Mail-Adresse"
            name="user-email"
            placeholder="ihre@emailadresse.at"
            description="An diese Adresse senden wir den Bestätigungscode und wichtige Informationen zu Ihrem Konto."
            required
            type="email"
          />
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
          <UploadField
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
            control={control}
            label="Ihr Profilbild (optional)"
            name="user-profilbild"
            className="md:col-span-2"
            placeholder="PNG, JPEG, GIF oder SVG, maximal 5 MB"
            setValue={setValue}
          />
        </>
      ),
    },
    {
      title: 'Verifizierung',
      heading: 'E-Mail bestätigen',
      icon: <Verified className="size-4" />,
      fields: [...verificationStepFields],
      component: (
        <>
          <Controller
            name="otp-e72"
            control={control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="gap-3 md:col-span-2 md:max-w-md"
              >
                <FieldContent className="gap-1">
                  <FieldLabel htmlFor="otp-e72">
                    <RequiredLabel label="Bestätigungscode" required />
                  </FieldLabel>
                  <FieldDescription>
                    Bitte geben Sie den 6-stelligen Code aus der E-Mail ein, die
                    wir an Ihre E-Mail-Adresse gesendet haben.
                  </FieldDescription>
                </FieldContent>
                <InputOTP
                  id="otp-e72"
                  aria-invalid={fieldState.invalid}
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={typeof field.value === 'string' ? field.value : ''}
                  onChange={field.onChange}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : null}
              </Field>
            )}
          />
        </>
      ),
    },
    {
      title: 'Optional',
      heading: 'Weitere Angaben',
      icon: <Check className="size-4" />,
      fields: [...profileStepFields],
      component: (
        <>
          {/* <UploadField
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
            control={control}
            label="Organisationslogo groß"
            name="orga-logo-gross"
            placeholder="PNG, JPEG, GIF oder SVG, maximal 5 MB"
            setValue={setValue}
          /> */}
          {/* <UploadField
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
            control={control}
            label="Organisationslogo klein"
            name="orga-logo-klein"
            placeholder="PNG, JPEG, GIF oder SVG, maximal 5 MB"
            setValue={setValue}
          /> */}
          <TextField
            control={control}
            description="So nennen Sie Personen, die Einsätze übernehmen, zum Beispiel Helfer:in, Trainer:in oder Vermittler:in."
            label="Bezeichnung für mitwirkende Personen (Singular)"
            name="orga-helfer-singular"
            placeholder="Helfer:in, Trainer:in oder Vermittler:in"
          />
          <TextField
            control={control}
            description="Pluralform für Personen, die Einsätze übernehmen."
            label="Bezeichnung für mitwirkende Personen (Plural)"
            name="orga-helfer-plural"
            placeholder="Helfer:innen, Trainer:innen oder Vermittler:innen"
          />
          <TextField
            control={control}
            description="So nennen Sie einen einzelnen Termin oder Einsatz in Ihrer Organisation."
            label="Bezeichnung für einen Termin oder Einsatz (Singular)"
            name="orga-einsatz-singular"
            placeholder="Workshop, Training oder Führung"
          />
          <TextField
            control={control}
            description="Pluralform für Termine oder Einsätze in Ihrer Organisation."
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
            description="Optional für Rückfragen oder für die Anzeige in Dokumenten und E-Mails."
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
    },
  ] as const;

  const onSubmit = handleSubmit(async (data: SignupSchemaOutput) => {
    console.log(data);
    reset();
  });

  if (isSubmitSuccessful) {
    return (
      <div className="border-border/60 flex min-h-[32rem] items-center justify-center rounded-lg border bg-white p-8 shadow-sm">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex max-w-md flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-full">
            <BadgeCheck className="size-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">
              Vielen Dank für Ihre Anmeldung
            </h2>
            <p className="text-muted-foreground text-sm">
              Ihre Angaben wurden erfasst. Wir melden uns zeitnah mit den
              nächsten Schritten bei Ihnen.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <form
      className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg bg-white px-6 py-6 shadow-sm md:px-10 md:py-8"
      onSubmit={onSubmit}
    >
      <MultiStepFormProvider
        stepsFields={[...steps]}
        onStepValidation={async (step) => {
          if (!shouldUseSchemaValidation) {
            return true;
          }
          const stepFields = step.fields.filter(isGeneratedFormField);
          return trigger(stepFields);
        }}
      >
        <MultiStepFormContent className="gap-4">
          <FormHeader />
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
            <StepHeading />
            <StepFields />
          </div>
          <FormFooter>
            <div className="flex items-center justify-end gap-3">
              <PreviousButton
                className="bg-muted text-muted-foreground hover:bg-muted h-9 rounded-xl border-0 px-4 py-2 shadow-none"
                variant="ghost"
              >
                <ChevronLeft />
                Zurück
              </PreviousButton>
              <NextButton className="h-9 rounded-xl px-5" size="default">
                Weiter
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
