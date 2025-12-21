"use client";
import * as z from "zod";
import { formSchema } from "./register-schema";
import { serverAction } from "@/actions/server-action";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useAction } from "next-safe-action/hooks";
import { motion } from "motion/react";
import {
  Field,
  FieldGroup,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSeparator,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Password } from "@/components/password";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  ControllerFieldState,
  ControllerRenderProps,
} from "react-hook-form";
import { FileUpload } from "@/components/file-upload";

type Schema = z.infer<typeof formSchema>;

export function DraftForm() {
  const form = useForm<Schema>({
    resolver: zodResolver(formSchema as any),
  });
  const formAction = useAction(serverAction, {
    onSuccess: () => {
      // TODO: show success message
      form.reset();
    },
    onError: () => {
      // TODO: show error message
    },
  });
  const handleSubmit = form.handleSubmit(async (data: Schema) => {
    formAction.execute(data);
  });

  const { isExecuting, hasSucceeded } = formAction;
  if (hasSucceeded) {
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
            Thank you
          </h2>
          <p className="text-center text-lg text-pretty text-muted-foreground">
            Form submitted successfully, we will get back to you soon
          </p>
        </motion.div>
      </div>
    );
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mx-auto"
    >
      <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
        <h2 className="mt-4 mb-1 font-bold text-2xl tracking-tight col-span-full">
          Noch benötigte Angaben
        </h2>

        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="gap-1 col-span-full"
            >
              <FieldLabel htmlFor="email">E‑Mail‑Adresse *</FieldLabel>
              <Input
                {...field}
                id="email"
                type="text"
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
                aria-invalid={fieldState.invalid}
                placeholder="max.mustermann@example.com"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="passwort1"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="gap-1 md:col-span-3"
            >
              <FieldContent className="gap-0.5">
                <FieldLabel htmlFor="passwort1">Passwort *</FieldLabel>
              </FieldContent>
              <Password
                {...field}
                aria-invalid={fieldState.invalid}
                id="passwort1"
                placeholder="Mindestens 8 Zeichen"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="passwort2"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="gap-1 md:col-span-3"
            >
              <FieldContent className="gap-0.5">
                <FieldLabel htmlFor="passwort2">
                  Passwort bestätigen *
                </FieldLabel>
              </FieldContent>
              <Password
                {...field}
                aria-invalid={fieldState.invalid}
                id="passwort2"
                placeholder="Passwort wiederholen"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <FieldSeparator className="my-4" />
        <h3 className="mt-3 mb-1 font-semibold text-xl tracking-tight col-span-full">
          Optionaler Bereich
        </h3>

        <Controller
          name="vorname"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="gap-1 md:col-span-3"
            >
              <FieldLabel htmlFor="vorname">Vorname </FieldLabel>
              <Input
                {...field}
                id="vorname"
                type="text"
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Max"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="nachname"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="gap-1 md:col-span-3"
            >
              <FieldLabel htmlFor="nachname">Nachname </FieldLabel>
              <Input
                {...field}
                id="nachname"
                type="text"
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
                aria-invalid={fieldState.invalid}
                placeholder="Mustermann"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="anrede"
          control={form.control}
          render={({ field, fieldState }) => {
            const options = [
              { value: "herr", label: "Herr" },
              { value: "frau", label: "Frau" },
              { value: "divers", label: "Divers" },
              { value: "keine angabe", label: "Keine Angabe" },
            ];
            return (
              <Field
                data-invalid={fieldState.invalid}
                className="gap-2 col-span-full"
              >
                <FieldLabel htmlFor="anrede">Anrede </FieldLabel>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "justify-between active:scale-100",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? field.options.find(
                            (option) => option.value === field.value
                          )?.label
                        : "Bitte Anrede auswählen"}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0 min-w-(--radix-popper-anchor-width) w-full"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder="tap to search..."
                        className="h-10"
                      />
                      <CommandList>
                        <CommandEmpty>No items found.</CommandEmpty>
                        <CommandGroup>
                          {options.map(({ label, value }) => (
                            <CommandItem
                              value={value}
                              key={value}
                              onSelect={() => {
                                form.setValue("anrede", value);
                              }}
                            >
                              {label}
                              <Check
                                className={cn(
                                  "ml-auto",
                                  value === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            );
          }}
        />

        <Controller
          name="telefon"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className="gap-1 col-span-full"
            >
              <FieldLabel htmlFor="telefon">Telefon </FieldLabel>
              <Input
                {...field}
                id="telefon"
                type="text"
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
                aria-invalid={fieldState.invalid}
                placeholder="+436601234567"
              />
              <FieldDescription>
                Wird anderen Organisationsmitgliedern angezeigt.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="picture"
          control={form.control}
          render={({ field, fieldState }) => (
            <div>
              <Field
                data-invalid={fieldState.invalid}
                className="gap-1 col-span-full"
              >
                <FieldLabel htmlFor="picture">
                  Profilbild hinzufügen{" "}
                </FieldLabel>
                <FieldDescription>
                  Wählen Sie eine Datei von Ihrem Gerät aus
                </FieldDescription>
                <FileUpload
                  {...field}
                  setValue={form.setValue}
                  name="picture"
                  placeholder="PNG, JPEG or Gif, (max. 5MB)"
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
      </FieldGroup>
      <div className="flex justify-end items-center w-full">
        <Button>{isExecuting ? "Submitting..." : "Submit"}</Button>
      </div>
    </form>
  );
}
