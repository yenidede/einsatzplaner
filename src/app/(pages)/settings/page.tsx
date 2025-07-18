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
import { hasCustomGetInitialProps } from "next/dist/build/utils";

export default function SettingsPage() {
    const id = useId();
    const [showLogos, setShowLogos] = useState<boolean>(true);
    const [getMailFromOrganization, setGetMailFromOrganization] = useState<boolean>(true);
    const { data: session, status } = useSession();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    
      const handleSave = async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email : user.email,
        logo_url: user.logo_url,
        phone : user.phone,
        hasLogoinCalendar: showLogos,
        hasGetMailNotification: getMailFromOrganization,
      }),
    });

    // Optional: Feedback anzeigen oder Seite neu laden
    // z.B. alert("Gespeichert!");
  };
  // User laden
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.replace("/signin");
      return;
    }
    fetch(`/api/settings?userId=${session.user.id}`)
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

    useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      router.back();
    }
  };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [router]);  

    const [email, setEmail] = useState<string>("");
    useEffect(() => {
      if (user?.email) {
        setEmail(user.email);
      }
    }, [user?.email]);

    const [phone, setPhone] = useState<string>("");

    useEffect(() => {
      if (user?.phone !== undefined) {
        setPhone(user.phone ?? "") ;
      }
    }, [user?.phone]);
    useEffect(() => {
  if (user && phone !== user.phone) {
    setUser({ ...user, phone });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [phone]);


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
            <button data-state="Default" data-type="outline" className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
                 onClick={() => router.back()}>
                <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal" >Abbrechen (ESC)</div>
            </button>
            <div data-state="Default" data-type="default" className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5"
                 onClick={handleSave}>
                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern</div>
            </div>
        </div>
    </div>
    <div className="self-stretch pl-2 py-4 inline-flex justify-start items-start gap-4 overflow-hidden">
        <div className="self-stretch inline-flex flex-col justify-between items-start">
            <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
                <div data-left-icon="true" data-right-icon="false" data-right-text="true" data-state="default" data-type="default" className="self-stretch px-2 py-1.5 bg-slate-100 rounded-md inline-flex justify-start items-center gap-2">
                    <div className="w-4 h-4 relative overflow-hidden">
                        <div className="w-3 h-3.5 left-[1.99px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                        <div className="w-1 h-1 left-[6px] top-[6px] absolute outline outline-2 outline-offset-[-1px] outline-slate-700" />
                    </div>
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
            <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
                <div data-state="Default" data-type="with icon" className="self-stretch px-4 py-2 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex justify-center items-center gap-2">
                    <div className="w-4 h-4 relative overflow-hidden">
                        <div className="w-1 h-3 left-[2px] top-[2px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
                        <div className="w-[3.33px] h-1.5 left-[10.67px] top-[4.67px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
                        <div className="w-2 h-0 left-[6px] top-[8px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
                    </div>
                    <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                        <LogoutIcon className="w-4 h-4 relative overflow-hidden">
                        </LogoutIcon>
                        <button className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal " >
                            Ausloggen
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-8">
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
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-normal">{user.firstname} {user.lastname}</div>
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
                            <div className="grid w-full max-w-sm items-center gap-3">
                        <LabelSettings htmlFor="firstname" className="text-sm font-medium">
                          Vorname
                        </LabelSettings>
                        <InputSettings
                          id="firstname"
                          value={user.firstname ?? ""}
                          className="w-full"
                          onChange={e => setUser({ ...user, firstname: e.target.value })}
                        />
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-3">
                        <LabelSettings htmlFor="lastname" className="text-sm font-medium">
                          Nachname
                        </LabelSettings>
                        <InputSettings
                          id="lastname"
                          value={user.lastname ?? ""}
                          className="w-full"
                          onChange={e => setUser({ ...user, lastname: e.target.value })}
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
                                    onChange={(e) => setPhone(e.target.value )}
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
                            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Zeige Logos in Kalenderansicht</div>
                                <div className="inline-flex items-center gap-2">
                                  <Switch
                                    id={id}
                                    checked={showLogos}
                                    onCheckedChange={setShowLogos}
                                    aria-label="Toggle switch"
                                  />
                                  <Label     htmlFor={id} className="text-sm font-medium">
                                    {showLogos ? "On" : "Off"}
                                  </Label>
                                </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                    <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Benachrichtigungen</div>
                    </div>
                </div>
                <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                    <div className="flex-1 px-4 flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start"><span className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Emails von </span><span className="text-slate-800 text-sm font-bold font-['Inter'] leading-tight">Jüdisches Museum Hohenems</span><span className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight"> erhalten</span></div>
                                <div className="inline-flex items-center gap-2">
                                  <Switch
                                    id={id}
                                    checked={getMailFromOrganization}
                                    onCheckedChange={setGetMailFromOrganization}
                                    aria-label="Toggle switch"
                                  />
                                  <Label     htmlFor={id} className="text-sm font-medium">
                                    {getMailFromOrganization ? "On" : "Off"}
                                  </Label>
                                </div>
                        </div>
                    </div>
                </div>
                <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                    <div className="flex-1 px-4 flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start"><span className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Emails von </span><span className="text-slate-800 text-sm font-bold font-['Inter'] leading-tight">Café JMH</span><span className="text-slate-800 text-sm font-medium font-['Inter'] leading-tight"> erhalten</span></div>
                                <div className="inline-flex items-center gap-2">
                                  <Switch
                                    id={id}
                                    checked={getMailFromOrganization}
                                    onCheckedChange={setGetMailFromOrganization}
                                    aria-label="Toggle switch"
                                  />
                                  <Label     htmlFor={id} className="text-sm font-medium">
                                    {getMailFromOrganization ? "On" : "Off"}
                                  </Label>
                                </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                    <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Meine Organisationen</div>
                    </div>
                </div>
                <div className="self-stretch px-4 py-6 flex flex-col justify-start items-start gap-4">
                    <div className="inline-flex justify-start items-center gap-4">
                        <div className="w-16 h-4 relative overflow-hidden">
                            <div className="w-3 h-3.5 left-[41.12px] top-[0.51px] absolute bg-orange-700" />
                            <div className="w-2.5 h-4 left-[53.70px] top-[0.24px] absolute bg-orange-700" />
                            <div className="w-2.5 h-3.5 left-[28.56px] top-[0.06px] absolute bg-orange-700" />
                            <div className="w-[0.80px] h-1 left-[2.02px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-1 left-[3.75px] top-0 absolute bg-orange-700" />
                            <div className="w-[2.83px] h-[3.17px] left-[7.23px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-[0.45px] h-[3.17px] left-[10.86px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[12.15px] top-[0.87px] absolute bg-orange-700" />
                            <div className="w-[2.84px] h-[3.29px] left-[14.76px] top-[0.87px] absolute bg-orange-700" />
                            <div className="w-[2.51px] h-[3.17px] left-[18.31px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.18px] left-[21.80px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[24.15px] top-[0.87px] absolute bg-orange-700" />
                            <div className="w-1 h-[3.17px] left-[5.89px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-[3.22px] left-[10.36px] top-[6.03px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[13.69px] top-[6px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.17px] left-[16.46px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-[3.23px] left-[18.93px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-1 h-[3.17px] left-[22.42px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-[2.51px] h-[3.18px] left-0 top-[11.18px] absolute bg-orange-700" />
                            <div className="w-[3.33px] h-[3.38px] left-[3.30px] top-[11.20px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-[3.18px] left-[7.40px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.18px] left-[10.89px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-[2.87px] h-[3.16px] left-[13.42px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.18px] left-[17.26px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-1 h-[3.16px] left-[19.80px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[24.17px] top-[11.11px] absolute bg-orange-700" />
                        </div>
                        <div className="inline-flex flex-col justify-center items-start gap-0.5">
                            <div className="justify-start text-slate-800 text-xl font-normal font-['Inter'] leading-7">Jüdisches Museum Hohenems</div>
                            <div className="inline-flex justify-start items-start gap-1">
                                <div className="p-1 bg-rose-400 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Superadmin</div>
                                </div>
                                <div className="p-1 bg-red-300 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">OV</div>
                                </div>
                                <div className="p-1 bg-orange-300 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">EV</div>
                                </div>
                                <div className="p-1 bg-cyan-200 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Helfer:in</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch flex flex-col justify-start items-end gap-2.5">
                        <div data-state="Default" data-type="with icon" className="px-4 py-2 bg-red-500 rounded-md inline-flex justify-center items-center gap-2">
                            <div className="w-4 h-4 relative overflow-hidden">
                                <div className="w-3 h-0 left-[2px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                <div className="w-2.5 h-2.5 left-[3.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                <div className="w-1.5 h-[2.67px] left-[5.33px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                            </div>
                            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Organisation verlassen</div>
                        </div>
                    </div>
                </div>
                <div className="self-stretch px-4 py-6 flex flex-col justify-start items-start gap-4">
                    <div className="inline-flex justify-start items-center gap-4">
                        <div className="w-16 h-4 relative overflow-hidden">
                            <div className="w-3 h-3.5 left-[41.12px] top-[0.51px] absolute bg-orange-700" />
                            <div className="w-2.5 h-4 left-[53.70px] top-[0.24px] absolute bg-orange-700" />
                            <div className="w-2.5 h-3.5 left-[28.56px] top-[0.06px] absolute bg-orange-700" />
                            <div className="w-[0.80px] h-1 left-[2.02px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-1 left-[3.75px] top-0 absolute bg-orange-700" />
                            <div className="w-[2.83px] h-[3.17px] left-[7.23px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-[0.45px] h-[3.17px] left-[10.86px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[12.15px] top-[0.87px] absolute bg-orange-700" />
                            <div className="w-[2.84px] h-[3.29px] left-[14.76px] top-[0.87px] absolute bg-orange-700" />
                            <div className="w-[2.51px] h-[3.17px] left-[18.31px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.18px] left-[21.80px] top-[0.93px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[24.15px] top-[0.87px] absolute bg-orange-700" />
                            <div className="w-1 h-[3.17px] left-[5.89px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-[3.22px] left-[10.36px] top-[6.03px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[13.69px] top-[6px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.17px] left-[16.46px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-[3.23px] left-[18.93px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-1 h-[3.17px] left-[22.42px] top-[6.05px] absolute bg-orange-700" />
                            <div className="w-[2.51px] h-[3.18px] left-0 top-[11.18px] absolute bg-orange-700" />
                            <div className="w-[3.33px] h-[3.38px] left-[3.30px] top-[11.20px] absolute bg-orange-700" />
                            <div className="w-[2.54px] h-[3.18px] left-[7.40px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.18px] left-[10.89px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-[2.87px] h-[3.16px] left-[13.42px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.18px] left-[17.26px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-1 h-[3.16px] left-[19.80px] top-[11.18px] absolute bg-orange-700" />
                            <div className="w-0.5 h-[3.29px] left-[24.17px] top-[11.11px] absolute bg-orange-700" />
                        </div>
                        <div className="inline-flex flex-col justify-center items-start gap-0.5">
                            <div className="justify-start text-slate-800 text-xl font-normal font-['Inter'] leading-7">Café JMH</div>
                            <div className="inline-flex justify-start items-start gap-1">
                                <div className="p-1 bg-rose-400 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Superadmin</div>
                                </div>
                                <div className="p-1 bg-red-300 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">OV</div>
                                </div>
                                <div className="p-1 bg-orange-300 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">EV</div>
                                </div>
                                <div className="p-1 bg-cyan-200 rounded-md flex justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Helfer:in</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch flex flex-col justify-start items-end gap-2.5">
                        <div data-state="Default" data-type="with icon" className="px-4 py-2 bg-red-500 rounded-md inline-flex justify-center items-center gap-2">
                            <div className="w-4 h-4 relative overflow-hidden">
                                <div className="w-3 h-0 left-[2px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                <div className="w-2.5 h-2.5 left-[3.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                <div className="w-1.5 h-[2.67px] left-[5.33px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                            </div>
                            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Organisation verlassen</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
    );
    }