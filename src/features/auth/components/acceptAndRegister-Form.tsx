"use client";
import * as z from "zod";
import { formSchema } from "@/features/auth/register-schema";
import { acceptInviteAndCreateNewAccount as serverAction } from "@/features/auth/actions";
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
import { Check, ChevronLeft, ChevronsUpDown } from "lucide-react";
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
import { FileUpload } from "@/components/form-fields/file-upload";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { settingsQueryKeys } from "@/features/settings/queryKeys/queryKey";
import { getSalutationsAction } from "@/features/settings/settings-action";
import { useEffect } from "react";
import { toast } from "sonner";
import { TabsContent } from "@/components/ui/tabs";

type Schema = z.infer<typeof formSchema>;
export type AvailableTab = "accept" | "register1" | "register2" | "other";

export function SignUpForm({
  email,
  tab,
  setTab,
}: {
  email: string;
  tab: AvailableTab;
  setTab: (tab: AvailableTab) => void;
}) {
  const { data: salutations = [] } = useQuery({
    queryKey: settingsQueryKeys.salutation(),
    queryFn: async () => {
      const res = await getSalutationsAction();
      return res;
    },
  });

  const form = useForm<Schema>({
    resolver: zodResolver(formSchema as any),
  });
  const formAction = useAction(serverAction, {
    onSuccess: () => {
      // TODO: show success message
      toast.success("Account erfolgreich erstellt!");
      form.reset();
    },
    onError: (error) => {
      // TODO: show error message
      toast.error(
        "Fehler beim Erstellen des Accounts. Bitte versuchen Sie es erneut." +
          error.error.validationErrors
      );
    },
  });
  const handleSubmit = form.handleSubmit(async (data: Schema) => {
    formAction.execute({
      ...data,
      picture: data.picture ?? null,
    });
  });

  const { isExecuting, hasSucceeded } = formAction;

  // email field comes from invite link
  useEffect(() => {
    form.setValue("email", email, {
      shouldValidate: true,
      shouldDirty: false,
    });
  }, [email, form]);

  useEffect(() => {
    if (hasSucceeded) {
      setTab("other");
    }
  }, [hasSucceeded, setTab]);

  if (hasSucceeded) {
    return (
      <TabsContent value="other">
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
              Danke
            </h2>
            <p className="text-center text-lg text-pretty text-muted-foreground">
              Account erfolgreich erstellt! Sie werden gleich weitergeleitet...
            </p>
          </motion.div>
        </div>
      </TabsContent>
    );
  }
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "p-2 sm:p-5 md:p-8 w-full rounded-md gap-2 border max-w-3xl mx-auto",
        tab === "accept" ? "hidden" : ""
      )}
    >
      <TabsContent value="register1">
        <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
          <h2 className="mb-1 font-semibold text-xl tracking-tight col-span-full">
            Pflichtfelder
          </h2>
          <Controller
            name="vorname"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="gap-1 md:col-span-3"
              >
                <FieldLabel htmlFor="vorname">Vorname *</FieldLabel>
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

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                <FieldLabel htmlFor="nachname">Nachname *</FieldLabel>
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

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="gap-1 col-span-full"
              >
                <FieldLabel htmlFor="email">
                  Zugewiesene Email-Adresse
                </FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="text"
                  // onChange={(e) => {
                  //   field.onChange(e.target.value);
                  // }}
                  aria-invalid={fieldState.invalid}
                  placeholder="max.mustermann@example.com"
                  // the mail should not be editable as it comes from the invite
                  value={email}
                  readOnly
                  aria-readonly
                  tabIndex={-1}
                  className="bg-muted cursor-not-allowed"
                />

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                  <FieldLabel htmlFor="passwort1">Neues Passwort *</FieldLabel>
                </FieldContent>
                <Password
                  {...field}
                  aria-invalid={fieldState.invalid}
                  id="passwort1"
                  placeholder="Mindestens 8 Zeichen"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <div className="flex justify-end items-center col-span-full mt-4">
            <Button variant="link" onClick={() => setTab("accept")}>
              <ChevronLeft />
              Zurück
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setTab("register2");
              }}
            >
              Weiter
            </Button>
          </div>
        </FieldGroup>
      </TabsContent>
      <TabsContent value="register2">
        <FieldGroup className="grid md:grid-cols-6 gap-4 mb-6">
          <h3 className="mb-1 font-semibold text-xl tracking-tight col-span-full">
            Optionaler Bereich
          </h3>

          <Controller
            name="anredeId"
            control={form.control}
            render={({ field, fieldState }) => {
              return (
                <Field
                  data-invalid={fieldState.invalid}
                  className="gap-2 col-span-full"
                >
                  <FieldLabel htmlFor="anredeId">Anrede </FieldLabel>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="anredeId"
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "justify-between active:scale-100 bg-transparent"
                        )}
                      >
                        {field.value
                          ? salutations.find((s) => s.id === field.value)
                              ?.salutation
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
                          placeholder="Suchen..."
                          className="h-10"
                        />
                        <CommandList>
                          <CommandEmpty>
                            Keine Auswahlmöglichkeiten gefunden.
                          </CommandEmpty>
                          <CommandGroup>
                            {salutations.map(({ salutation, id }) => (
                              <CommandItem
                                value={id}
                                key={id}
                                onSelect={() => {
                                  form.setValue("anredeId", id);
                                }}
                              >
                                {salutation}
                                <Check
                                  className={cn(
                                    "ml-auto",
                                    id === field.value
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="picture"
            control={form.control}
            render={({ field, fieldState }) => (
              <div className="col-span-full">
                <Field data-invalid={fieldState.invalid}>
                  <div>
                    <FieldLabel htmlFor="picture">
                      Profilbild hinzufügen{" "}
                    </FieldLabel>
                    <FieldDescription>
                      Wählen Sie eine Datei von Ihrem Gerät aus
                    </FieldDescription>
                  </div>
                  <FileUpload
                    {...field}
                    id="picture"
                    setValue={(name, value, options) => {
                      form.setValue(
                        name as keyof Schema,
                        value as any,
                        options
                      );
                    }}
                    name="picture"
                    placeholder="PNG, JPEG oder Gif (max. 5MB)"
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
          <div className="flex justify-end items-center col-span-full mt-4">
            <Button variant="link" onClick={() => setTab("register1")}>
              <ChevronLeft />
              Zurück
            </Button>
            <Button type="submit">
              {isExecuting ? "Account wird erstellt..." : "Account erstellen"}
            </Button>
          </div>
        </FieldGroup>
      </TabsContent>
    </form>
  );
}

export default SignUpForm;
