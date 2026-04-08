"use client"
import * as z from "zod"
import { formSchema } from '@/lib/form-schema'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, Controller, type FieldPath } from "react-hook-form"
import { motion } from "framer-motion"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Field, FieldContent, FieldLabel, FieldDescription, FieldError, FieldSeparator } from "@/components/ui/field"
import {
    FormHeader,
    FormFooter,
    StepFields,
    PreviousButton,
    NextButton,
    SubmitButton,
    MultiStepFormContent } from "@/components/multi-step-viewer";
import { MultiStepFormProvider } from "@/hooks/use-multi-step-viewer";

import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot
} from "@/components/ui/input-otp"
import { Password } from '@/components/password'
import { FileUpload } from '@/components/form-fields/file-upload'

//------------------------------
type SchemaInput = z.input<typeof formSchema>;
type SchemaOutput = z.output<typeof formSchema>;

const isGeneratedFormField = (value: string): value is FieldPath<SchemaInput> =>
  value in formSchema.shape;


export function GeneratedForm() {
    
  const form = useForm<SchemaInput, unknown, SchemaOutput>({
    resolver: zodResolver(formSchema),
  });
  const { formState: { isSubmitting, isSubmitSuccessful } } = form;

  const handleSubmit = form.handleSubmit(async (data: SchemaOutput) => {
    try {
      // TODO: implement form submission
      console.log(data);
      form.reset();
    } catch (error) {
      // TODO: handle error
    }
  });
  const stepsFields = [
      { 
        fields: ["orga-name","orga-kuerzel","user-vorname","user-nachname","user-email","user-password","user-passwort-confirm"],
        component: <>
                
        <Controller
          name="orga-name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="orga-name">Organisationsname *</FieldLabel>
              <Input
                {...field}
                id="orga-name"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Jüdisches Museum Hohenems"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="orga-kuerzel"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="orga-kuerzel">Organisationsname Kürzel </FieldLabel>
              <Input
                {...field}
                id="orga-kuerzel"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="JMH"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
<FieldSeparator className="my-4" />

        <Controller
          name="user-vorname"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="user-vorname">Vorname *</FieldLabel>
              <Input
                {...field}
                id="user-vorname"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="David"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="user-nachname"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="user-nachname">Nachname *</FieldLabel>
              <Input
                {...field}
                id="user-nachname"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Kathrein"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="user-email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
            <FieldLabel htmlFor="user-email">Email *</FieldLabel>
              <Input
                {...field}
                id="user-email"
                type="email"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="ihre@emailadresse.at"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="user-password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="user-password">Passwort *</FieldLabel>
              <Password
                id="user-password"
                value={field.value ?? ""}
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Mindestens 8 Zeichen, idealerweise mit Zahlen und Sonderzeichen"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="user-passwort-confirm"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="user-passwort-confirm">Passwort bestätigen *</FieldLabel>
              <Password
                id="user-passwort-confirm"
                value={field.value ?? ""}
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Bitte wiederholen Sie Ihr Passwort"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
                  </>
      }
      ,
      { 
        fields: ["otp-e72"],
        component: <>
                
        <Controller
            name="otp-e72" 
            control={form.control}
            render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                  <FieldContent className="gap-1">
                    <FieldLabel htmlFor="otp-e72">Einmalcode</FieldLabel>
                    <FieldDescription>Bitte geben Sie den 6-stelligen Code ein, den wir an Ihre E-Mail-Adresse gesendet haben.</FieldDescription>
                  </FieldContent>
                    <InputOTP
                      {...field}
                      aria-invalid={fieldState.invalid}
                      id="otp-e72"
                      
                      maxLength={6}
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
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
          )}
        />
                  </>
      }
      ,
      { 
        fields: ["orga-logo-gross","orga-logo-klein","orga-helfer-singular","orga-helfer-plural","orga-einsatz-singular","user-phone","user-profilbild"],
        component: <>
                
        <Controller
          name="orga-logo-gross"
          control={form.control}
          render={({ field, fieldState }) => (
            <div>
              <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
                <FieldLabel htmlFor="orga-logo-gross">Organisationslogo Groß </FieldLabel>
                <FieldDescription>Waehlen Sie eine Datei von Ihrem Geraet aus.</FieldDescription>
                <FileUpload
                  {...field}
                  setValue={form.setValue}
                  name="orga-logo-gross"
                  placeholder="PNG, JPEG oder Gif, (max. 5MBs). Größe wird automatisch angepasst."
                  accept={`image/png, image/jpeg, image/gif, svg/xml`}
                  maxFiles={1}
                  maxSize={5242880}
                  
                />
              </Field>
              {Array.isArray(fieldState.error) ? (
                fieldState.error?.map((error, i) => (
                  <p
                    key={i}
                    role="alert"
                    data-slot="field-error"
                    className="text-destructive text-sm"
                  >
                    {error.message}
                  </p>
                ))
              ) : (
                <FieldError errors={[fieldState.error]} />
              )}
            </div>
          )}
        />

        <Controller
          name="orga-logo-klein"
          control={form.control}
          render={({ field, fieldState }) => (
            <div>
              <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
                <FieldLabel htmlFor="orga-logo-klein">Organisationslogo Klein </FieldLabel>
                <FieldDescription>Waehlen Sie eine Datei von Ihrem Geraet aus.</FieldDescription>
                <FileUpload
                  {...field}
                  setValue={form.setValue}
                  name="orga-logo-klein"
                  placeholder="PNG, JPEG oder Gif, (max. 5MB)"
                  accept={`image/png, image/jpeg, image/gif`}
                  maxFiles={1}
                  maxSize={5242880}
                  
                />
              </Field>
              {Array.isArray(fieldState.error) ? (
                fieldState.error?.map((error, i) => (
                  <p
                    key={i}
                    role="alert"
                    data-slot="field-error"
                    className="text-destructive text-sm"
                  >
                    {error.message}
                  </p>
                ))
              ) : (
                <FieldError errors={[fieldState.error]} />
              )}
            </div>
          )}
        />

        <Controller
          name="orga-helfer-singular"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="orga-helfer-singular">Helfer:in Bezeichnung (Singular) </FieldLabel>
              <Input
                {...field}
                id="orga-helfer-singular"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Helfer:in, Trainer:in oder Vermittler:in"
                
              />
              <FieldDescription>Externe Personen, welche nicht in der Verwaltung tätig sind.  </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="orga-helfer-plural"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 md:col-span-3">
            <FieldLabel htmlFor="orga-helfer-plural">Bezeichnung Helfer:innen (Plurar) </FieldLabel>
              <Input
                {...field}
                id="orga-helfer-plural"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Helfer:innen, Trainer:innen oder Vermittler:innen"
                
              />
              <FieldDescription>Externe Personen, welche nicht in der Verwaltung tätig sind.  </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="orga-einsatz-singular"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 ">
            <FieldLabel htmlFor="orga-einsatz-singular">Bezeichnung Einsatz (Singular) </FieldLabel>
              <Input
                {...field}
                id="orga-einsatz-singular"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Workshop, Training oder Führung"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
<FieldSeparator className="my-4" />

        <Controller
          name="user-phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1 ">
            <FieldLabel htmlFor="user-phone">Telefon </FieldLabel>
              <Input
                {...field}
                id="user-phone"
                type="text"
                onChange={(e) => {
                field.onChange(e.target.value)
                }}
                aria-invalid={fieldState.invalid}
                placeholder="+43 123 4567890"
                
              />
              
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="user-profilbild"
          control={form.control}
          render={({ field, fieldState }) => (
            <div>
              <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full">
                <FieldLabel htmlFor="user-profilbild">Profilbild </FieldLabel>
                <FieldDescription>Waehlen Sie eine Datei von Ihrem Geraet aus.</FieldDescription>
                <FileUpload
                  {...field}
                  setValue={form.setValue}
                  name="user-profilbild"
                  placeholder="PNG, JPEG oder GIF, maximal 5 MB"
                  accept={`image/png, image/jpeg, image/gif`}
                  maxFiles={1}
                  maxSize={5242880}
                  
                />
              </Field>
              {Array.isArray(fieldState.error) ? (
                fieldState.error?.map((error, i) => (
                  <p
                    key={i}
                    role="alert"
                    data-slot="field-error"
                    className="text-destructive text-sm"
                  >
                    {error.message}
                  </p>
                ))
              ) : (
                <FieldError errors={[fieldState.error]} />
              )}
            </div>
          )}
        />
                  </>
      }
      ];

  if (isSubmitSuccessful) {
    return (
      <div className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, stiffness: 300, damping: 25 }}
          className="h-full py-6 px-3"
        >
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{
              delay: 0.3,
              type: "spring",
              stiffness: 500,
              damping: 15,
            }}
            className="mb-4 flex justify-center border rounded-full w-fit mx-auto p-2"
          >
            <Check className="size-8" />
          </motion.div>
          <h2 className="text-center text-2xl text-pretty font-bold mb-2">
            Vielen Dank
          </h2>
          <p className="text-center text-lg text-pretty text-muted-foreground">
            Ihr Formular wurde erfolgreich uebermittelt. Wir melden uns zeitnah bei Ihnen.
          </p>
        </motion.div>
      </div>
    );
  }
  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col p-2 md:p-5 w-full mx-auto rounded-md max-w-3xl gap-2 border">
        <MultiStepFormProvider
          stepsFields={stepsFields}
          onStepValidation={async (step) => {
            const stepFields = step.fields.filter(isGeneratedFormField);
            const isValid = await form.trigger(stepFields);
            return isValid;
          }}>
          <MultiStepFormContent>
            <FormHeader />
            <StepFields />
            <FormFooter>
                <PreviousButton>
                  <ChevronLeft />
                  Zurueck
                </PreviousButton>
                <NextButton>
                  Weiter <ChevronRight />
                </NextButton>
                <SubmitButton 
                  type="submit"
                  disabled={isSubmitting} 
                >
                  {isSubmitting ? "Wird gesendet..." : "Absenden"}
                </SubmitButton>
              </FormFooter>
            </MultiStepFormContent>
          </MultiStepFormProvider>
        </form>
    </div>
  )
}
