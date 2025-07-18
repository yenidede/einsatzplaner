"use client";

import { useEffect, useId, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LogoutIcon from "@/components/icon/LogoutIcon";
import SwitchIcon from "@/components/icon/SwitchIcon";
import { useUserPreferences } from "@/features/settings/hooks/useUserPreference";
import { Switch } from "@/features/settings/components/ui/switch";
import { Label } from "@/features/settings/components/ui/label";

import {LabelSettings} from "@/features/settings/components/ui/LabelSettings";
import {InputSettings} from "@/features/settings/components/ui/InputSettings";
import { Settings } from "lucide-react";
import SettingsIcon from "@/components/icon/SettingsIcon";

export default function SettingsPage() {
  const id = useId();
  const [checked, setChecked] = useState<boolean>(true);
  
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // User laden
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.replace("/signin");
      return;
    }
    fetch(`/api/auth/settings?userId=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data || data.error) {
          router.replace("/signin");
        } else {
          setUser(data);
        }
      })
      .finally(() => setLoading(false));
  }, [session?.user?.id, status, router]);

    const [email, setEmail] = useState<string>("");
    useEffect(() => {
      if (user?.email) {
        setEmail(user.email);
      }
    }, [user?.email]);

    const [phone, setPhone] = useState<string>("");
    useEffect(() => {
      if (user?.phone) {
        setPhone(user.phone);
      }
    }, [user?.phone]);

  // Hook immer aufrufen, mit Fallback-Werten
  const { showLogos, toggleShowLogos } = useUserPreferences({
    showLogosInCalendar: user?.showLogosInCalendar ?? false,
    userId: user?.id ?? "",
  });

  if (loading || !user) {
    return <div>Lade Einstellungen…</div>;
  }



  // Initialen für Avatar
  const initials = `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase();

  return (
<div className="w-[842px] bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex flex-col justify-center items-center">
    <div className="w-[842px] p-4 border-b border-slate-200 inline-flex justify-start items-start gap-8">
        <div className="flex-1 h-8 flex justify-center items-center gap-2.5">
            <div className="flex-1 justify-start text-slate-800 text-2xl font-semibold font-['Poppins'] leading-loose">Einstellungen</div>
        </div>
        <div className="flex justify-end items-center gap-2">
            <div data-state="Default" data-type="outline" className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
                <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Abbrechen (ESC)</div>
            </div>
            <div data-state="Default" data-type="default" className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5">
                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern</div>
            </div>
        </div>
    </div>
    <div className="self-stretch h-[572px] pl-2 py-4 inline-flex justify-start items-start gap-4 overflow-hidden">
        <div className="self-stretch inline-flex flex-col justify-between items-start">
            <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
                <div data-left-icon="true" data-right-icon="false" data-right-text="true" data-state="default" data-type="default" className="self-stretch px-2 py-1.5 bg-slate-100 rounded-md inline-flex justify-start items-center gap-2">
                    <SettingsIcon className="w-4 h-4 text-slate-700" />
                    <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">Allgemein</div>
                    <div className="justify-start"></div>
                </div>
                <div className="self-stretch h-px bg-slate-200" />
                <div className="justify-start text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">Organisationsverwaltung</div>
                <div data-left-icon="true" data-right-icon="false" data-right-text="true" data-state="default" data-type="default" className="self-stretch px-2 py-1.5 bg-white inline-flex justify-start items-center gap-2">
                    <div className="w-4 h-4 relative overflow-hidden">
                        <div className="w-2.5 h-3.5 left-[2.67px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-1 h-[2.67px] left-[6px] top-[12px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[5.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[10.67px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[8px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[8px] top-[6.67px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[8px] top-[9.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[10.67px] top-[6.67px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[10.67px] top-[9.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[5.33px] top-[6.67px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[5.33px] top-[9.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                    </div>
                    <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">Jüdisches Museum Hoh...</div>
                    <div className="justify-start"></div>
                </div>
                <div data-left-icon="true" data-right-icon="false" data-right-text="true" data-state="default" data-type="default" className="self-stretch px-2 py-1.5 bg-white inline-flex justify-start items-center gap-2">
                    <div className="w-4 h-4 relative overflow-hidden">
                        <div className="w-2.5 h-3.5 left-[2.67px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-1 h-[2.67px] left-[6px] top-[12px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[5.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[10.67px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[8px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[8px] top-[6.67px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[8px] top-[9.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[10.67px] top-[6.67px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[10.67px] top-[9.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[5.33px] top-[6.67px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-[0.01px] h-0 left-[5.33px] top-[9.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                    </div>
                    <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">Café JMH</div>
                    <div className="justify-start"></div>
                </div>
            </div>
            <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2" onClick={() => signOut({callbackUrl: '/signin'})}>
                <div data-state="Default" data-type="with icon" className="self-stretch px-4 py-2 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex justify-center items-center gap-2">
                    <LogoutIcon className="w-4 h-4 relative overflow-hidden">
                    </LogoutIcon>
                    <button className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal " >
                        Ausloggen
                        </button>
                </div>
            </div>
        </div>
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-12">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
                <div className="self-stretch flex flex-col justify-start items-start gap-2">
                    <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
                        <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">Mein Account</div>
                    </div>
                    <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
                        <div className="self-stretch px-4 flex flex-col justify-start items-start gap-2">
                            <div className="inline-flex justify-start items-center gap-2">
                                <div data-type="avatar initials" className="w-10 h-10 px-2 py-1.5 bg-slate-200 rounded-[20px] inline-flex flex-col justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">{initials}</div>
                                </div>
                                <div className="inline-flex flex-col justify-center items-start">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-normal">{user.firstName} {user.lastName}</div>
                                </div>
                            </div>
                            <div className="inline-flex justify-end items-start gap-2">
                                <div className="px-4 py-2 bg-slate-900 rounded-md flex justify-center items-center gap-2">
                                    <div className="w-4 h-4 relative overflow-hidden">
                                        <div className="w-3 h-3 left-[2px] top-[2px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white" />
                                        <div className="w-1 h-0 left-[10.67px] top-[3.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white" />
                                        <div className="w-0 h-1 left-[12.67px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white" />
                                        <div className="w-[2.67px] h-[2.67px] left-[4.67px] top-[4.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white" />
                                        <div className="w-2.5 h-1.5 left-[4px] top-[7.55px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white" />
                                    </div>
                                    <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Profilbild hochladen</div>
                                </div>
                                <div data-state="Default" data-type="outline" className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Profilbild entfernen</div>
                                </div>
                            </div>
                        </div>

                        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                            <div className="w-full gap-3 flex flex-col">

                                <LabelSettings htmlFor="fullname" className="text-sm font-medium">
                                    Name
                                </LabelSettings>
                                <InputSettings
                                    id="fullname"
                                    value={`${user.firstname} ${user.lastname}`}
                                    className="w-full"
                                    onChange={(e) => {
                                        const [firstname, lastname] = e.target.value.split(" ");
                                        setUser({...user, firstname, lastname});
                                    }}
                                />
                            </div>
                        </div>
                        <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                            <div className="grid w-full max-w-sm items-center gap-3">
                                <LabelSettings htmlFor={id} className="text-sm font-medium">
                                    E-Mail
                                </LabelSettings>
                                <InputSettings
                                    id={id}
                                    value={email}
                                    className="w-full"
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                    <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Persönliche Präferenzen</div>
                    </div>
                </div>
                <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                    <div className="flex-1 px-4 flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">
                                    Zeige Logos in Kalenderansicht
                                </div>
                                <div className="inline-flex items-center gap-2">
                                  <Switch
                                    id={id}
                                    checked={checked}
                                    onCheckedChange={setChecked}
                                    aria-label="Toggle switch"
                                  />
                                  <Label     htmlFor={id} className="text-sm font-medium">
                                    {checked ? "On" : "Off"}
                                  </Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    );
    }