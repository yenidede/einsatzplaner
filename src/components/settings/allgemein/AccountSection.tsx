'use client';

import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import ProfilePictureUpload from '@/components/settings/ProfilePictureUpload';
import Image from 'next/image';
import { Upload } from 'lucide-react';

interface AccountSectionProps {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  pictureUrl: string | null;
  previewUrl: string | null;
  onFirstnameChange: (value: string) => void;
  onLastnameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onProfilePictureUpload: (file: File) => void;
  onRemoveProfilePicture: () => void;
}

export function AccountSection({
  firstname,
  lastname,
  email,
  phone,
  pictureUrl,
  previewUrl,
  onFirstnameChange,
  onLastnameChange,
  onEmailChange,
  onPhoneChange,
  onProfilePictureUpload,
  onRemoveProfilePicture,
}: AccountSectionProps) {
  const emailId = useId();

  const initials = `${firstname?.[0] || ''}${
    lastname?.[0] || ''
  }`.toUpperCase();

  return (
    <div className="flex flex-col items-start justify-center gap-4 self-stretch">
      <div className="flex flex-col items-start justify-start gap-2 self-stretch">
        <div className="inline-flex items-center justify-start gap-2.5 self-stretch px-4 pt-2">
          <div className="justify-start font-['Inter'] text-sm leading-tight font-semibold text-slate-900">
            Mein Account
          </div>
        </div>

        <div className="flex flex-col items-start justify-start gap-4 self-stretch border-t border-slate-200 py-4">
          <div className="flex flex-col items-start justify-start gap-2 self-stretch px-4">
            <div className="inline-flex items-center justify-start gap-2">
              {previewUrl || pictureUrl ? (
                <Image
                  src={previewUrl || pictureUrl || ''}
                  width={48}
                  height={48}
                  alt={previewUrl ? 'Profilbild Vorschau' : 'Profilbild'}
                  className="h-10 w-10 rounded-full border object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="inline-flex h-10 w-10 flex-col items-center justify-center gap-2.5 rounded-[20px] bg-slate-200 px-2 py-1.5">
                  <div className="justify-start font-['Inter'] text-base leading-7 font-normal text-slate-900">
                    {initials}
                  </div>
                </div>
              )}
              <div className="inline-flex flex-col items-start justify-center">
                <div className="justify-start font-['Inter'] text-sm leading-normal font-medium text-slate-700">
                  {firstname} {lastname}
                </div>
              </div>
            </div>

            <div className="inline-flex items-start justify-start gap-2">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-white"
                onClick={() =>
                  (
                    document.querySelector(
                      'input[type=file]'
                    ) as HTMLInputElement | null
                  )?.click()
                }
              >
                <Upload className="h-4 w-4" />
                <span>Profilbild hochladen</span>
              </button>
              <ProfilePictureUpload onUpload={onProfilePictureUpload} />

              <button
                type="button"
                className="flex items-center justify-center gap-2.5 rounded-md bg-white px-4 py-2 outline -outline-offset-1 outline-slate-200"
                onClick={onRemoveProfilePicture}
              >
                <span>Profilbild entfernen</span>
              </button>
            </div>
          </div>

          <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="firstname" className="text-sm font-medium">
                Vorname
              </Label>
              <Input
                id="firstname"
                value={firstname}
                className="w-full"
                onChange={(e) => onFirstnameChange(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="lastname" className="text-sm font-medium">
                Nachname
              </Label>
              <Input
                id="lastname"
                value={lastname}
                className="w-full"
                onChange={(e) => onLastnameChange(e.target.value)}
              />
            </div>
          </div>

          <div className="inline-flex items-start justify-start gap-4 self-stretch px-4">
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor={emailId} className="text-sm font-medium">
                E-Mail
              </Label>
              <Input
                id={emailId}
                value={email}
                className="w-full"
                onChange={(e) => onEmailChange(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-3">
              <Label htmlFor="phone" className="text-sm font-medium">
                Telefon
              </Label>
              <Input
                id="phone"
                value={phone}
                className="w-full"
                onChange={(e) => onPhoneChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
