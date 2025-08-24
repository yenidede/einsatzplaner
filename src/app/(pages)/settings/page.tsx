"use client";

import { useEffect, useId, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LogoutIcon from "@/components/icon/LogoutIcon";
import { Switch } from "@/features/settings/components/ui/switch";
import { Label } from "@/features/settings/components/ui/label";

import {LabelSettings} from "@/features/settings/components/ui/LabelSettings";
import {InputSettings} from "@/features/settings/components/ui/InputSettings";
import SettingsIcon from "@/components/icon/SettingsIcon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrganisationIcon from "@/features/settings/components/ui/OrganisationIcon";
import UploadProfilePictureIcon from "@/features/settings/components/ui/UploadProfilePictureIcon";
import ProfilePictureUpload from "@/features/settings/components/ProfilePictureUpload";
import OrganizationCard from "@/features/settings/components/OrganizationCard";
import { hasPermission } from "@/lib/auth/authGuard";



export default function SettingsPage() {
  const id = useId();
  const [showLogos, setShowLogos] = useState<boolean>(true);
  const [getMailFromOrganization, setGetMailFromOrganization] = useState<boolean>(true);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  // Lade Userdaten mit TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ["userSettings", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const res = await fetch(`/api/settings?userId=${session?.user.id}`);
      if (!res.ok) throw new Error("Fehler beim Laden");
      return res.json();
    },
  });

  const hasManagePermission = (roles: any[] | undefined) => {
    if (!Array.isArray(roles)) return false;
    return roles.some((role:any) => {
      const name = (role?.name ?? "");
      return hasPermission(name, "manage:org");
    });
  };

  // Setze Userdaten, Email und Phone, wenn Query-Daten geladen sind
  useEffect(() => {
    if (data) {
      setUser(data);
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setShowLogos(data.hasLogoinCalendar ?? true);
      setGetMailFromOrganization(data.hasGetMailNotification ?? true);
      (data.organizations || []);
    }
  }, [data]);

  // Mutation zum Speichern
  type UserSettings = {
    userId: any;
    firstname: any;
    lastname: any;
    email: string;
    picture_url: any;
    phone: string;
    hasLogoinCalendar: boolean;
    hasGetMailNotification: boolean;
  };

  const mutation = useMutation({
    mutationFn: async (newSettings: UserSettings) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Fehler beim Speichern");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings", session?.user.id] });
    },
  });

const handleSave = async () => {
  if (!user) return;
  let pictureUrl = user.picture_url;
  if (profilePictureFile) {
    const formData = new FormData();
    formData.append("file", profilePictureFile);
    formData.append("userId", user.id);
    const res = await fetch("/api/upload-profile-picture", {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      pictureUrl = data.url;
    }
  }
  // benutze mutateAsync, warte auf Abschluss
  await mutation.mutateAsync({
    userId: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email,
    picture_url: pictureUrl,
    phone,
    hasLogoinCalendar: showLogos,
    hasGetMailNotification: getMailFromOrganization,
  });

  // Organisationseinstellungen parallel speichern (falls Backend einzelne PUT erwartet)
  if (user.organizations && user.organizations.length > 0) {
    await Promise.all(
      user.organizations.map((org: any) =>
        fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            userOrgId: org.userOrgRoleId,
            hasGetMailNotification: org.hasGetMailNotification,
          }),
        })
      )
    );
  }
};

const handleProfilePictureUpload = (file: File) => {
  setProfilePictureFile(file);
};

  if (isLoading || !user) {
    return <div>Lade Einstellungen…</div>;
  }
  if (error) {
    return <div>Fehler beim Laden der Einstellungen.</div>;
  }

  // Initialen für Avatar
  const initials = `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase();

    async function handleOrganizationLeave(id: any) {
        if (!user) return;
        const confirmed = window.confirm("Möchtest du die Organisation wirklich verlassen?");
        if (!confirmed) return;
        try {
            const res = await fetch("/api/organization/leave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, organizationId: id }),
            });
            if (!res.ok) throw new Error("Fehler beim Verlassen der Organisation");
            // Aktualisiere die Userdaten nach dem Verlassen
            queryClient.invalidateQueries({ queryKey: ["userSettings", user.id] });
        } catch (err) {
            alert("Fehler beim Verlassen der Organisation.");
        }
    }

  return (
      <div className="w-full max-w-screen-xl mx-auto bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
        <div className="w-full p-4 border-b border-slate-200 flex justify-between items-center gap-8">
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
                                    <SettingsIcon className="w-4 h-4 relative overflow-hidden" />
                                </div>
                                <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">Allgemein</div>
                                <div className="justify-start"></div>
                            </div>
                            <div className="self-stretch h-px bg-slate-200" />
                            <div className="justify-start text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">Organisationsverwaltung</div>
                            {user.organizations && user.organizations.filter((org: any) => {
                              if (!Array.isArray(org.roles)) return false;
                              return org.roles.some((role: any) => {
                                const roleName = typeof role === 'string' ? role : role?.name || '';
                                const roleAbbr = typeof role === 'string' ? '' : role?.abbreviation || '';
                                return roleName.toLowerCase().includes('organisationsverwaltung') || 
                                       roleName.toLowerCase().includes('superadmin') ||
                                       roleAbbr.toLowerCase() === 'ov' ||
                                       roleName.toLowerCase() === 'ov';
                              });
                            }).length > 0 ? (
                              user.organizations.filter((org: any) => {
                                if (!Array.isArray(org.roles)) return false;
                                return org.roles.some((role: any) => {
                                  const roleName = typeof role === 'string' ? role : role?.name || '';
                                  const roleAbbr = typeof role === 'string' ? '' : role?.abbreviation || '';
                                  return roleName.toLowerCase().includes('organisationsverwaltung') || 
                                         roleName.toLowerCase().includes('superadmin') ||
                                         roleAbbr.toLowerCase() === 'ov' ||
                                         roleName.toLowerCase() === 'ov';
                                });
                              }).map((org: any) => (
                                <button 
                                  key={org.id} 
                                  onClick={() => router.push(`/organization/${org.id}/manage`)}
                                  className="w-full text-left px-2 py-1.5 bg-white hover:bg-slate-50 rounded-md inline-flex justify-start items-center gap-2 transition-colors"
                                >
                                  <OrganisationIcon />
                                  <div className="flex-1 justify-start text-slate-700 text-base font-medium font-['Inter'] leading-normal">{org.name}</div>
                                </button>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-xs text-gray-400">Keine Berechtigung</div>
                            )}
              </div>
            <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
                <div data-state="Default" data-type="with icon" className="self-stretch px-4 py-2 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex justify-center items-center gap-2"
                    onClick={()=>signOut()}>
                        <LogoutIcon className="w-4 h-4 relative overflow-hidden">
                        </LogoutIcon>
                        <span className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">
                            Ausloggen
                        </span>
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
                                {profilePictureFile ? (
                                  <img
                                    src={URL.createObjectURL(profilePictureFile)}
                                    alt="Profilbild Vorschau"
                                    className="w-10 h-10 rounded-full object-cover border"
                                  />
                                ) : user.picture_url ? (
                                  <img
                                    src={user.picture_url}
                                    alt="Profilbild"
                                    className="w-10 h-10 rounded-full object-cover border"
                                  />
                                ) : (
                                  <div data-type="avatar initials" className="w-10 h-10 px-2 py-1.5 bg-slate-200 rounded-[20px] inline-flex flex-col justify-center items-center gap-2.5">
                                    <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">{initials}</div>
                                  </div>
                                )}
                                <div className="inline-flex flex-col justify-center items-start">
                                    <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-normal">{user.firstname} {user.lastname}</div>
                                </div>
                                
                            </div>
                            <div className="inline-flex justify-start items-start gap-2">
{/*                                 <ProfilePictureUpload
                                    onUpload={handleProfilePictureUpload}
                                />
                            <UploadProfilePictureIcon />{/* */}
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-slate-900 text-white rounded-md inline-flex justify-center items-center gap-2"
                                    onClick={() => (document.querySelector('input[type=file]') as HTMLInputElement | null)?.click()}
                                >
                                    <UploadProfilePictureIcon />
                                    <span>Profilbild hochladen</span>
                                </button>
                                <ProfilePictureUpload
                                    onUpload={handleProfilePictureUpload}
                                />
                            <div className="inline-flex justify-end items-start gap-2">
                                </div>
                                    <button
                                    type="button" 
                                    className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
                                    onClick={() => {
                                        if (!user) return;
                                        setProfilePictureFile(null);
                                        mutation.mutate({
                                            userId: user.id,
                                            firstname: user.firstname,
                                            lastname: user.lastname,
                                            email,
                                            picture_url: null,
                                            phone,
                                            hasLogoinCalendar: showLogos,
                                            hasGetMailNotification: getMailFromOrganization,
                                        });
                                    }}
                                >
                                    <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Profilbild entfernen</div>
                                </button>
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
                    <div className="flex-1 px-4 flex flex-col gap-2">
                      {user.organizations && user.organizations.length > 0 ? (
                        user.organizations.map((org: any, idx: number) => (
                          <div key={org.id} className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <Label htmlFor={`org-switch-${org.id}`} className="text-sm font-medium">
                              Emails von <span className="font-bold">{org.name}</span> erhalten
                            </Label>
                            <div className="inline-flex items-center gap-2">
                              <Switch
                                id={`org-switch-${org.id}`}
                                checked={org.hasGetMailNotification}
                                onCheckedChange={checked => {
                                  // Nur lokalen State ändern, nicht speichern
                                  setUser((prev: any) => {
                                    const orgs = [...prev.organizations];
                                    orgs[idx] = { ...orgs[idx], hasGetMailNotification: checked };
                                    return { ...prev, organizations: orgs };
                                  });
                                }}
                                aria-label={`Toggle switch for ${org.name}`}
                              />
                              <Label htmlFor={`org-switch-${org.id}`} className="text-sm font-medium">
                                {org.hasGetMailNotification ? "On" : "Off"}
                              </Label>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500">Keine Organisationen für Benachrichtigungen.</div>
                      )}
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                    <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Meine Organisationen</div>
                    </div>
                </div>
                {user.organizations && user.organizations.length > 0 ? (
  user.organizations.map((org: any) => {
    //console.log('Organisation:', org.name, 'Rollen:', org.roles);
    return (
      <div key={org.id}>
        <OrganizationCard
          name={org.name}
          roles={org.roles}
          onLeave={() => {handleOrganizationLeave(org.id)}}
        />
      </div>
    );
  })
) : (
  <div className="text-slate-500">Du bist in keiner Organisation.</div>
)}
            </div>
        </div>
    </div>
</div>
    );
    }

