'use client';
import * as z from 'zod';
import { formSchema } from '@/features/auth/register-schema';
import { acceptInviteAndCreateNewAccount as serverAction } from '@/features/auth/actions';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useAction } from 'next-safe-action/hooks';
import { motion } from 'framer-motion';
import {
  Field,
  FieldGroup,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
} from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Password } from '@/components/password';
import { Check, ChevronLeft, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FileUpload } from '@/components/form/file-upload';
import { cn } from '@/lib/utils';
import { useSalutations } from '@/features/settings/hooks/useUserProfile';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TabsContent } from '@/components/ui/tabs';
import {
  createAvatarUploadUrl,
  deleteAvatarFromStorage,
} from '@/features/user/user-dal';
import { signIn } from 'next-auth/react';

type Schema = z.infer<typeof formSchema>;
export type AvailableTab = 'accept' | 'register1' | 'register2' | 'other';

export function SignUpForm({
  email,
  userId,
  tab,
  setTab,
  invitationId,
}: {
  email: string;
  invitationId: string;
  userId: string;
  tab: AvailableTab;
  setTab: (tab: AvailableTab) => void;
}) {
  const [anredePopoverOpen, setAnredePopoverOpen] = useState(false);
  const { data: salutations = [] } = useSalutations();
  const profilePictureUploadFromClient = async (
    optimizedFile: File
  ): Promise<string> => {
    const loadingToastId = toast.loading('Profilbild wird hochgeladen...');
    const { uploadUrl, path } = await createAvatarUploadUrl(
      userId,
      invitationId
    );

    const res = await fetch(uploadUrl, {
      method: 'PUT',
      body: optimizedFile,
      headers: {
        'Content-Type': optimizedFile.type,
      },
    });

    toast.dismiss(loadingToastId);
    if (!res.ok) {
      toast.error('Failed to upload profile picture.', { id: 'upload-failed' });
    } else toast.success('Profilbild erfolgreich hochgeladen!');

    return path;
  };

  const form = useForm<Schema>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      vorname: '',
      nachname: '',
      email,
      passwort: '',
      passwort2: '',
      anredeId: undefined,
      telefon: '',
      pictureUrl: '',
    },
  });
  const formAction = useAction(serverAction, {
    onSuccess: (res) => {
      if (res.data?.success !== true) {
        toast.error(
          'Fehler beim Erstellen des Accounts. Bitte versuchen Sie es erneut oder wenden Sie sich an den Administrator.'
        );
        setTab('register1');
        return;
      }
      toast.success(res.data?.message);
      signIn('credentials', {
        email: form.getValues('email'),
        password: form.getValues('passwort'),
        redirect: true,
        callbackUrl: '/',
      });
    },
    onError: (error) => {
      // TODO: show error message
      toast.error(
        'Fehler beim Erstellen des Accounts. Bitte versuchen Sie es erneut oder wenden Sie sich an den Administrator. \nError:' +
          error.error
      );
      setTab('register1');
    },
  });
  const handleSubmit = form.handleSubmit(async (data: Schema) =>
    formAction.execute({
      ...data,
      pictureUrl: data.pictureUrl || undefined,
    })
  );

  const { isExecuting, hasSucceeded } = formAction;

  // email field comes from invite link
  useEffect(() => {
    form.setValue('email', email);
    form.setValue('userId', userId);
    form.setValue('invitationId', invitationId);
  }, [form, email, userId, invitationId]);

  useEffect(() => {
    if (hasSucceeded) {
      setTab('other');
    }
  }, [hasSucceeded, setTab]);

  if (hasSucceeded) {
    return (
      <TabsContent value="other">
        <div className="w-full gap-2 rounded-md border p-2 sm:p-5 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, stiffness: 300, damping: 25 }}
            className="h-full px-3 py-6"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{
                delay: 0.3,
                type: 'spring',
                stiffness: 500,
                damping: 15,
              }}
              className="mx-auto mb-4 flex w-fit justify-center rounded-full border p-2"
            >
              <Check className="size-8" />
            </motion.div>
            <h2 className="mb-2 text-center text-2xl font-bold text-pretty">
              Danke
            </h2>
            <p className="text-muted-foreground text-center text-lg text-pretty">
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
        'mx-auto w-full max-w-3xl gap-2 rounded-md border p-2 sm:p-5 md:p-8',
        tab === 'accept' ? 'hidden' : ''
      )}
    >
      <TabsContent value="register1">
        <FieldGroup className="mb-6 grid gap-4 md:grid-cols-6">
          <h2 className="col-span-full mb-1 text-xl font-semibold tracking-tight">
            Pflichtfelder
          </h2>
          <Controller
            name="vorname"
            control={form.control}
            defaultValue=""
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
            defaultValue=""
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
            defaultValue={email}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="col-span-full gap-1"
              >
                <FieldLabel htmlFor="email">
                  Zugewiesene Email-Adresse
                </FieldLabel>
                <Input
                  {...field}
                  id="email"
                  name="email"
                  type="email"
                  disabled
                  aria-invalid={fieldState.invalid}
                  placeholder="max.mustermann@example.com"
                  autoComplete="username"
                  className="bg-muted"
                />
                <FieldDescription>
                  Diese E-Mail-Adresse wurde Ihnen zugewiesen und kann nicht
                  geändert werden.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="passwort"
            control={form.control}
            defaultValue=""
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="gap-1 md:col-span-3"
              >
                <FieldContent className="gap-0.5">
                  <FieldLabel htmlFor="passwort">Neues Passwort *</FieldLabel>
                </FieldContent>
                <Password
                  {...field}
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  id="passwort"
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
            defaultValue=""
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
                  autoComplete="new-password"
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
          <div className="col-span-full mt-4 flex items-center justify-end">
            <Button variant="link" onClick={() => setTab('accept')}>
              <ChevronLeft />
              Zurück
            </Button>
            <Button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                const valid = await form.trigger();
                console.log(
                  'Form valid:',
                  valid,
                  form.formState.errors,
                  form.getValues('userId')
                );
                if (valid) {
                  setTab('register2');
                }
              }}
            >
              Weiter
            </Button>
          </div>
        </FieldGroup>
      </TabsContent>
      <TabsContent value="register2">
        <FieldGroup className="mb-6 grid gap-4 md:grid-cols-6">
          <h3 className="col-span-full mb-1 text-xl font-semibold tracking-tight">
            Optionaler Bereich
          </h3>

          <Controller
            name="anredeId"
            control={form.control}
            defaultValue={undefined}
            render={({ field, fieldState }) => {
              return (
                <Field
                  data-invalid={fieldState.invalid}
                  className="col-span-full gap-2"
                >
                  <FieldLabel htmlFor="anredeId">Anrede </FieldLabel>

                  <Popover
                    open={anredePopoverOpen}
                    onOpenChange={setAnredePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        id="anredeId"
                        variant="outline"
                        type="button"
                        role="combobox"
                        className={cn(
                          'justify-between bg-transparent active:scale-100'
                        )}
                      >
                        {field.value
                          ? salutations.find((s) => s.id === field.value)
                              ?.salutation
                          : 'Bitte Anrede auswählen'}
                        <ChevronsUpDown className="opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-full min-w-(--radix-popper-anchor-width) p-0"
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
                                  form.setValue('anredeId', id);
                                  setAnredePopoverOpen(false);
                                }}
                              >
                                {salutation}
                                <Check
                                  className={cn(
                                    'ml-auto',
                                    id === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0'
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
            defaultValue=""
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className="col-span-full gap-1"
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
            name="pictureUrl"
            control={form.control}
            defaultValue=""
            render={({ field, fieldState }) => (
              <div className="col-span-full">
                <Field data-invalid={fieldState.invalid}>
                  <div>
                    <FieldLabel htmlFor="pictureUrl">
                      Profilbild hinzufügen{' '}
                    </FieldLabel>
                    <FieldDescription>
                      Wählen Sie eine Datei von Ihrem Gerät aus
                    </FieldDescription>
                  </div>
                  <FileUpload
                    {...field}
                    id="pictureUrl"
                    setValue={(name, value, options) => {
                      form.setValue(
                        name as keyof Schema,
                        value as any,
                        options
                      );
                    }}
                    onUpload={async (file) => {
                      const path = await profilePictureUploadFromClient(file);
                      // store the string, not the file
                      field.onChange(path);
                      return path;
                    }}
                    onFileRemove={deleteAvatarFromStorage}
                    name="pictureUrl"
                    placeholder="PNG, JPEG oder Gif (max. 5MB)"
                    accept={`image/png, image/jpeg, image/gif`}
                    maxFiles={1}
                    maxSize={500000} // approx 480kB, 500kB max allowed in db
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
          <div className="col-span-full mt-4 flex items-center justify-end">
            <Button variant="link" onClick={() => setTab('register1')}>
              <ChevronLeft />
              Zurück
            </Button>
            <Button type="submit">
              {isExecuting ? 'Account wird erstellt...' : 'Account erstellen'}
            </Button>
          </div>
        </FieldGroup>
      </TabsContent>
    </form>
  );
}

export default SignUpForm;
