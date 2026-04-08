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
import { Controller, type FieldPath, useForm } from 'react-hook-form';
import { Password } from '@/components/password';
import {
  FormFooter,
  FormHeader,
  MultiStepFormContent,
  NextButton,
  PreviousButton,
  StepFields,
  SubmitButton,
} from '@/components/form/MultiStepForm';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  MultiStepFormProvider,
  useMultiStepForm,
} from '@/hooks/use-multi-step-form';
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
  const { currentStepData } = useMultiStepForm();

  if (!currentStepData.heading) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-col gap-1">
      <h1 className="text-3xl font-semibold tracking-tight">
        {currentStepData.heading}
      </h1>
      <p className="text-muted-foreground text-sm">
        Mit dieser Registrierung legen Sie eine neue Organisation an. Wenn Sie
        einer bestehenden Organisation beitreten möchten, wenden Sie sich bitte
        an Ihre Administratorin oder Ihren Administrator.
      </p>
      {currentStepData.subheading ? (
        <p className="text-muted-foreground text-sm">
          {currentStepData.subheading}
        </p>
      ) : null}
    </div>
  );
}

export function SelfSignupForm() {
  const form = useForm<SignupSchemaInput, unknown, SignupSchemaOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      'orga-name': '',
      'orga-kuerzel': '',
      'otp-e72': '',
      'orga-helfer-plural': '',
      'orga-helfer-singular': '',
      'orga-einsatz-singular': '',
      'user-email': '',
      'user-nachname': '',
      'user-password': '',
      'user-passwort-confirm': '',
      'user-phone': '',
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
            label="Organisationsname"
            name="orga-name"
            placeholder="Jüdisches Museum Hohenems"
            required
          />
          <TextField
            className="gap-2"
            control={control}
            label="Kürzel"
            name="orga-kuerzel"
            placeholder="JMH"
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
            label="Vorname"
            name="user-vorname"
            placeholder="David"
            required
          />
          <TextField
            control={control}
            label="Nachname"
            name="user-nachname"
            placeholder="Kathrein"
            required
          />
          <TextField
            className="gap-2 md:col-span-2"
            control={control}
            label="E-Mail"
            name="user-email"
            placeholder="ihre@emailadresse.at"
            required
            type="email"
          />
          <PasswordField
            control={control}
            label="Passwort"
            name="user-password"
            placeholder="Mindestens 8 Zeichen"
            required
          />
          <PasswordField
            control={control}
            label="Passwort bestätigen"
            name="user-passwort-confirm"
            placeholder="Bitte wiederholen Sie Ihr Passwort"
            required
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
                    <RequiredLabel label="Einmalcode" required />
                  </FieldLabel>
                  <FieldDescription>
                    Bitte geben Sie den Code aus der E-Mail ein, die wir Ihnen
                    gesendet haben.
                  </FieldDescription>
                </FieldContent>
                <InputOTP
                  id="otp-e72"
                  aria-invalid={fieldState.invalid}
                  maxLength={6}
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
          <UploadField
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
            control={control}
            label="Organisationslogo groß"
            name="orga-logo-gross"
            placeholder="PNG, JPEG, GIF oder SVG, maximal 5 MB"
            setValue={setValue}
          />
          <UploadField
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
            control={control}
            label="Organisationslogo klein"
            name="orga-logo-klein"
            placeholder="PNG, JPEG, GIF oder SVG, maximal 5 MB"
            setValue={setValue}
          />
          <FieldSeparator className="md:col-span-2" />
          <TextField
            control={control}
            description="Zum Beispiel Helfer:in oder Trainer:in."
            label="Bezeichnung Helfer:in"
            name="orga-helfer-singular"
            placeholder="Helfer:in"
          />
          <TextField
            control={control}
            description="Zum Beispiel Helfer:innen oder Trainer:innen."
            label="Bezeichnung Helfer:innen"
            name="orga-helfer-plural"
            placeholder="Helfer:innen"
          />
          <TextField
            control={control}
            label="Bezeichnung Einsatz"
            name="orga-einsatz-singular"
            placeholder="Workshop"
          />
          <TextField
            control={control}
            label="Telefon"
            name="user-phone"
            placeholder="+43 123 4567890"
          />
          <UploadField
            accept="image/png, image/jpeg, image/gif, image/svg+xml"
            control={control}
            label="Profilbild"
            name="user-profilbild"
            className="md:col-span-2"
            placeholder="PNG, JPEG, GIF oder SVG, maximal 5 MB"
            setValue={setValue}
          />
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
      <div className="border-border/60 flex min-h-[32rem] items-center justify-center rounded-[2rem] border bg-white p-8 shadow-sm">
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
      className="flex h-[80vh] min-h-0 w-full flex-col overflow-hidden rounded-lg bg-white px-6 py-6 shadow-sm md:px-10 md:py-8"
      onSubmit={onSubmit}
    >
      <MultiStepFormProvider
        stepsFields={[...steps]}
        onStepValidation={async (step) => {
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
            <PreviousButton
              className="bg-muted text-muted-foreground hover:bg-muted rounded-xl border-0 px-4 py-2 shadow-none"
              variant="ghost"
            >
              <ChevronLeft />
              Zurück
            </PreviousButton>
            <div className="ml-auto flex items-center gap-3">
              <NextButton className="rounded-xl px-5" size="default">
                Weiter
                <ChevronRight />
              </NextButton>
              <SubmitButton className="rounded-xl px-5" disabled={isSubmitting}>
                {isSubmitting ? 'Wird gesendet...' : 'Absenden'}
                {!isSubmitting ? <KeyRound /> : null}
              </SubmitButton>
            </div>
          </FormFooter>
        </MultiStepFormContent>
      </MultiStepFormProvider>
    </form>
  );
}
