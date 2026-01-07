"use client";

import { useId } from "react";
import { LabelSettings } from "@/features/settings/components/ui/LabelSettings";
import { InputSettings } from "@/features/settings/components/ui/InputSettings";
import UploadProfilePictureIcon from "@/features/settings/components/ui/UploadProfilePictureIcon";
import ProfilePictureUpload from "@/features/settings/components/ProfilePictureUpload";

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

  const initials = `${firstname?.[0] || ""}${
    lastname?.[0] || ""
  }`.toUpperCase();

  return (
    <div className="self-stretch flex flex-col justify-center items-start gap-4">
      <div className="self-stretch flex flex-col justify-start items-start gap-2">
        <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
          <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">
            Mein Account
          </div>
        </div>

        <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
          <div className="self-stretch px-4 flex flex-col justify-start items-start gap-2">
            <div className="inline-flex justify-start items-center gap-2">
              {previewUrl || pictureUrl ? (
                <img
                  src={previewUrl || pictureUrl || ""}
                  alt={previewUrl ? "Profilbild Vorschau" : "Profilbild"}
                  className="w-10 h-10 rounded-full object-cover border"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 px-2 py-1.5 bg-slate-200 rounded-[20px] inline-flex flex-col justify-center items-center gap-2.5">
                  <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">
                    {initials}
                  </div>
                </div>
              )}
              <div className="inline-flex flex-col justify-center items-start">
                <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-normal">
                  {firstname} {lastname}
                </div>
              </div>
            </div>

            <div className="inline-flex justify-start items-start gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 text-white rounded-md inline-flex justify-center items-center gap-2"
                onClick={() =>
                  (
                    document.querySelector(
                      "input[type=file]"
                    ) as HTMLInputElement | null
                  )?.click()
                }
              >
                <UploadProfilePictureIcon />
                <span>Profilbild hochladen</span>
              </button>
              <ProfilePictureUpload onUpload={onProfilePictureUpload} />

              <button
                type="button"
                className="px-4 py-2 bg-white rounded-md outline -outline-offset-1 outline-slate-200 flex justify-center items-center gap-2.5"
                onClick={onRemoveProfilePicture}
              >
                <span>Profilbild entfernen</span>
              </button>
            </div>
          </div>

          <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
            <div className="grid w-full max-w-sm items-center gap-3">
              <LabelSettings
                htmlFor="firstname"
                className="text-sm font-medium"
              >
                Vorname
              </LabelSettings>
              <InputSettings
                id="firstname"
                value={firstname}
                className="w-full"
                onChange={(e) => onFirstnameChange(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-3">
              <LabelSettings htmlFor="lastname" className="text-sm font-medium">
                Nachname
              </LabelSettings>
              <InputSettings
                id="lastname"
                value={lastname}
                className="w-full"
                onChange={(e) => onLastnameChange(e.target.value)}
              />
            </div>
          </div>

          <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
            <div className="grid w-full max-w-sm items-center gap-3">
              <LabelSettings htmlFor={emailId} className="text-sm font-medium">
                E-Mail
              </LabelSettings>
              <InputSettings
                id={emailId}
                value={email}
                className="w-full"
                onChange={(e) => onEmailChange(e.target.value)}
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-3">
              <LabelSettings htmlFor="phone" className="text-sm font-medium">
                Telefon
              </LabelSettings>
              <InputSettings
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
