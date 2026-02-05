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
import { Check, ChevronLeft, ChevronsUpDown, Sparkle } from 'lucide-react';
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
import { useEffect, useState, useRef, useCallback } from 'react';
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

  // Refs for focus management
  const vornameRef = useRef<HTMLInputElement>(null);
  const nachnameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwortRef = useRef<HTMLInputElement>(null);
  const passwort2Ref = useRef<HTMLInputElement>(null);
  const telefonRef = useRef<HTMLInputElement>(null);
  const anredeButtonRef = useRef<HTMLButtonElement>(null);

  const generateAppleStylePassword = (): string => {
    // Generate Apple-style password
    // Format: lowercase-lowercase+uppercase-number+lowercase
    // Uses Web Crypto API for cryptographically secure randomness
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    // Helper function to get cryptographically secure random integer in range [0, max)
    const getSecureRandomInt = (max: number): number => {
      const randomValues = new Uint32Array(1);
      crypto.getRandomValues(randomValues);
      return randomValues[0] % max;
    };

    // Helper function to get a random character from a string
    const getRandomChar = (chars: string): string => {
      return chars[getSecureRandomInt(chars.length)];
    };

    // First part: 6 lowercase letters
    const part1 = Array.from({ length: 6 }, () =>
      getRandomChar(lowercase)
    ).join('');

    // Second part: starts lowercase, has uppercase mixed in (6 chars)
    const part2Chars = Array.from({ length: 6 }, (_, i) => {
      if (i === 0) {
        // First char is lowercase
        return getRandomChar(lowercase);
      } else {
        // Mix of lowercase and uppercase (50/50 chance)
        const pool = getSecureRandomInt(2) === 0 ? lowercase : uppercase;
        return getRandomChar(pool);
      }
    }).join('');

    // Third part: starts with number, then lowercase (6 chars)
    const part3 =
      getRandomChar(numbers) +
      Array.from({ length: 5 }, () => getRandomChar(lowercase)).join('');

    return `${part1}-${part2Chars}-${part3}`;
  };

  const handleGeneratePassword = () => {
    const generatedPassword = generateAppleStylePassword();

    // Find the actual input elements within Password components
    // Password component wraps InputGroupInput, so we need to find the input inside
    const passwortInput = document.getElementById(
      'passwort'
    ) as HTMLInputElement;
    const passwort2Input = document.getElementById(
      'passwort2'
    ) as HTMLInputElement;

    // Helper to set value and trigger events that password managers listen for
    const setPasswordValue = (
      input: HTMLInputElement,
      value: string,
      fieldName: 'passwort' | 'passwort2'
    ) => {
      if (!input) return;

      // Focus the input first (password managers need focus to detect changes)
      input.focus();

      // Update form state first through react-hook-form
      form.setValue(fieldName, value, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });

      // Set the value directly on the DOM element
      input.value = value;

      // Create InputEvent with proper properties for password managers
      // Password managers typically listen for 'input' events with inputType 'insertText'
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: value,
      });

      // Create change event
      const changeEvent = new Event('change', {
        bubbles: true,
        cancelable: true,
      });

      // Dispatch events that password managers listen for
      // Order matters: input first, then change
      input.dispatchEvent(inputEvent);
      input.dispatchEvent(changeEvent);

      // Blur and refocus to ensure password managers detect the change
      setTimeout(() => {
        input.blur();
        input.focus();
      }, 50);
    };

    // Set password values with proper event dispatching
    if (passwortInput) {
      setPasswordValue(passwortInput, generatedPassword, 'passwort');
    }

    // Small delay between fields to help password managers detect both
    setTimeout(() => {
      if (passwort2Input) {
        setPasswordValue(passwort2Input, generatedPassword, 'passwort2');
      }
    }, 100);

    toast.success('Passwort generiert');
  };

  const profilePictureUploadFromClient = async (
    optimizedFile: File
  ): Promise<string> => {
    // Use a unique toast ID to prevent duplicate toasts
    const toastId = 'profile-picture-upload';
    
    // Dismiss any existing toast with this ID before showing a new one
    toast.dismiss(toastId);
    
    const loadingToastId = toast.loading('Profilbild wird hochgeladen...', {
      id: toastId,
    });
    
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
    } else {
      toast.success('Profilbild erfolgreich hochgeladen!', { id: toastId });
    }

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
        email: res.data.email || form.getValues('email'),
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

  // Focus management when tab changes
  useEffect(() => {
    if (tab === 'register1') {
      // Focus first field when entering register1
      setTimeout(() => {
        vornameRef.current?.focus();
      }, 100);
    } else if (tab === 'register2') {
      // Focus first field when entering register2
      setTimeout(() => {
        anredeButtonRef.current?.focus();
      }, 100);
    }
  }, [tab]);

  // Helper function to find input element by ID (for Password components)
  const getInputById = (id: string): HTMLInputElement | null => {
    return document.getElementById(id) as HTMLInputElement | null;
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLFormElement>) => {
      // Escape key: go back
      if (e.key === 'Escape') {
        e.preventDefault();
        if (tab === 'register2') {
          setTab('register1');
        } else if (tab === 'register1') {
          setTab('accept');
        }
        return;
      }

      // Enter key on form fields (not in textareas or when popover is open)
      if (e.key === 'Enter' && !e.shiftKey && !anredePopoverOpen) {
        const target = e.target as HTMLElement;

        // Don't handle Enter if we're in a button or if it's a form submission
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          return;
        }

        // Don't handle Enter if we're in the Command component (popover)
        if (target.closest('[data-slot="command"]')) {
          return;
        }

        e.preventDefault();

        if (tab === 'register1') {
          // Navigate through fields in register1
          if (target.id === 'vorname') {
            nachnameRef.current?.focus();
          } else if (target.id === 'nachname') {
            emailRef.current?.focus();
          } else if (target.id === 'email') {
            // For Password component, find the input element
            const passwortInput =
              getInputById('passwort') || passwortRef.current;
            passwortInput?.focus();
          } else if (target.id === 'passwort') {
            // For Password component, find the input element
            const passwort2Input =
              getInputById('passwort2') || passwort2Ref.current;
            passwort2Input?.focus();
          } else if (target.id === 'passwort2') {
            // Trigger "Weiter" button
            const valid = await form.trigger();
            if (valid) {
              setTab('register2');
            }
          }
        } else if (tab === 'register2') {
          // Navigate through fields in register2
          if (target.id === 'telefon') {
            // Focus submit button
            const submitButton = document.querySelector(
              'button[type="submit"]'
            ) as HTMLButtonElement;
            submitButton?.focus();
          }
        }
      }
    },
    [tab, form, anredePopoverOpen, setTab]
  );

  // Handle moving forward
  const handleMoveForward = useCallback(async () => {
    if (tab === 'register1') {
      const valid = await form.trigger([
        'vorname',
        'nachname',
        'email',
        'passwort',
        'passwort2',
      ]);
      if (valid) {
        setTab('register2');
      }
    } else if (tab === 'register2') {
      // Submit form
      handleSubmit();
    }
  }, [tab, form, setTab, handleSubmit]);

  // Handle moving backward
  const handleMoveBackward = useCallback(() => {
    if (tab === 'register2') {
      setTab('register1');
    } else if (tab === 'register1') {
      setTab('accept');
    }
  }, [tab, setTab]);

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
      onKeyDown={handleKeyDown}
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
                  ref={(e) => {
                    field.ref(e);
                    vornameRef.current = e;
                  }}
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
                  ref={(e) => {
                    field.ref(e);
                    nachnameRef.current = e;
                  }}
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
                  ref={(e) => {
                    field.ref(e);
                    emailRef.current = e;
                  }}
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
                  ref={field.ref}
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
                  ref={field.ref}
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
          <div className="col-span-full flex justify-start">
            <Button
              type="button"
              variant="ghost"
              onClick={handleGeneratePassword}
              className="gap-2"
            >
              <Sparkle className="size-4" />
              Passwort generieren
            </Button>
          </div>
          <div className="col-span-full mt-4 flex items-center justify-end">
            <Button
              variant="link"
              onClick={handleMoveBackward}
              type="button"
              aria-label="Zurück (Escape)"
            >
              <ChevronLeft />
              Zurück
            </Button>
            <Button
              type="button"
              onClick={handleMoveForward}
              aria-label="Weiter (Enter)"
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
                        ref={anredeButtonRef}
                        id="anredeId"
                        variant="outline"
                        type="button"
                        role="combobox"
                        aria-expanded={anredePopoverOpen}
                        aria-haspopup="listbox"
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
                  ref={(e) => {
                    field.ref(e);
                    telefonRef.current = e;
                  }}
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
                    placeholder="PNG, JPEG oder Gif. Bilder werden vor dem Upload automatisch komprimiert."
                    accept={`image/png, image/jpeg, image/gif`}
                    maxFiles={1}
                    // maxSize={500000} // approx 480kB, 500kB max allowed in db
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
            <Button
              variant="link"
              onClick={handleMoveBackward}
              type="button"
              aria-label="Zurück (Escape)"
            >
              <ChevronLeft />
              Zurück
            </Button>
            <Button type="submit" aria-label="Account erstellen (Enter)">
              {isExecuting ? 'Account wird erstellt...' : 'Account erstellen'}
            </Button>
          </div>
        </FieldGroup>
      </TabsContent>
    </form>
  );
}

export default SignUpForm;
