"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

import { useEffect, useId, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import LogoutIcon from "@/components/icon/LogoutIcon";
import { Switch } from "@/features/settings/components/ui/switch";
import { Label } from "@/features/settings/components/ui/label";
import Image from "next/image";

import {LabelSettings} from "@/features/settings/components/ui/LabelSettings";
import {InputSettings} from "@/features/settings/components/ui/InputSettings";
import SettingsIcon from "@/components/icon/SettingsIcon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OrganisationIcon from "@/features/settings/components/ui/OrganisationIcon";
import UploadProfilePictureIcon from "@/features/settings/components/ui/UploadProfilePictureIcon";
import ProfilePictureUpload from "@/features/settings/components/ProfilePictureUpload";
import OrganizationCard from "@/features/settings/components/OrganizationCard";
import { hasPermission } from "@/lib/auth/authGuard";
import { UserProfileDialog } from '@/features/settings/components/UserProfileDialog';
import { InviteUserForm } from '@/features/invitations/components/InviteUserForm';
import { useInvitations } from '@/features/invitations/hooks/useInvitation';

export default function OrganizationManagePage() {
    const params = useParams();
    const router = useRouter();
    const queryClient = useQueryClient();
    const orgId = params?.orgId as string;
    const { data: session, status } = useSession();
    const [user, setUser] = useState<any>(null);

    // Invitation
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [description, setDescription] = useState("");
    const [helperSingular, setHelperSingular] = useState("");
    const [helperPlural, setHelperPlural] = useState("");
    
    const [logoUrl, setLogoUrl] = useState<string>("");
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ["userSettings", session?.user?.id],
        enabled: !!session?.user?.id,
        queryFn: async () => {
            const res = await fetch(`/api/settings?userId=${session?.user.id}`);
            if (!res.ok) throw new Error("Fehler beim Laden");
            return res.json();
        },
    });

    // setze user sobald query daten da sind
    useEffect(() => {
        if (data) setUser(data);
    }, [data]);

    // lade die spezifische Organisation und setze Name/Beschreibung
    const { data: orgData, isLoading: orgLoading, error: orgError } = useQuery({
        queryKey: ["organization", orgId],
        enabled: !!orgId,
        queryFn: async () => {
            const res = await fetch(`/api/auth/organization?id=${orgId}`);
            if (!res.ok) throw new Error("Fehler beim Laden der Organisation");
            return res.json();
        },
    });
    //console.log(orgData)
    useEffect(() => {
        if (orgData) {
            setName(orgData.name ?? "");
            setDescription(orgData.description ?? "");
            setLogoUrl(orgData.logo_url ?? "");
            // setze E-Mail / Telefon falls vorhanden (fallbacks prüfen je nach deiner API / Schema)
            setEmail(orgData.email ?? orgData.mail ?? orgData.contact_email ?? "");
            setPhone(orgData.phone ?? orgData.telefon ?? orgData.phone_number ?? "");
            setHelperSingular(orgData.helper_name_singular ?? "Helfer:in");
            setHelperPlural(orgData.helper_name_plural ?? "Helfer:innen");
        }
    }, [orgData]);

    // Lade User der Organisation (user_organization_role)
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ["organizationUsers", orgId],
        enabled: !!orgId,
        queryFn: async () => {
            const res = await fetch(`/api/auth/organization/${orgId}/users`);
            if (!res.ok) {
                if(res.status === 401){
                    signOut({callbackUrl:'/signin'})
                    throw new Error("Unauthorized")
                }
                    throw new Error("Fehler beim Laden der User");
                }
            return res.json();
        },
    });

    const handleSignOut = async () => {
        try {
            await signOut({
                callbackUrl: '/signin',
                redirect: true
            });

            queryClient.clear();
        } catch (error) {
            console.error("Fehler beim Abmelden:", error);
            router.push('/signin');
        }
    };

    // Logo Upload Handler
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
  
        // Validierung
        if (!file.type.startsWith('image/')) {
            alert('Bitte nur Bilddateien hochladen.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Datei zu groß. Maximum 5MB.');
            return;
        }
  
        setLogoFile(file);
        
        // Preview anzeigen
        const reader = new FileReader();
        reader.onload = (e) => {
            setLogoUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    // Logo Entfernen Handler
    const handleLogoRemove = () => {
        setLogoUrl("");
        setLogoFile(null);
        // Input field zurücksetzen
        const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const updateMutation = useMutation({
        mutationFn: async (data: { name: string; description: string; email?: string; phone?: string; helper_name_singular?: string; helper_name_plural?: string; logoFile?: File | null; removeLogo?: boolean }) => {
            // Erst Logo hochladen falls vorhanden
            let finalLogoUrl = logoUrl;
            
            if (data.removeLogo) {
                finalLogoUrl = "";
            } else if (data.logoFile) {
                const formData = new FormData();
                formData.append('logo', data.logoFile);
                formData.append('orgId', orgId);
                
                const uploadRes = await fetch('/api/upload/logo', {
                    method: 'POST',
                    body: formData,
                });
                
                if (!uploadRes.ok) throw new Error('Logo Upload fehlgeschlagen');
                const uploadData = await uploadRes.json();
                finalLogoUrl = uploadData.url;
            }

            const res = await fetch("/api/auth/organization", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: orgId,
                    name: data.name,
                    description: data.description,
                    email: data.email ?? email,
                    phone: data.phone ?? phone,
                    helper_name_singular: data.helper_name_singular ?? helperSingular,
                    helper_name_plural: data.helper_name_plural?? helperPlural,
                    logo_url: finalLogoUrl
                }),
            });
            if (!res.ok) throw new Error("Fehler beim Speichern");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organization", orgId] });
            setLogoFile(null);
            //alert("Organisation erfolgreich aktualisiert!");
        },
        onError: (error) => {
            //alert("Fehler beim Speichern der Organisation.");
            console.error(error);
        }
    });

    const handleSave = () => {
        updateMutation.mutate({ 
            name,
            description,
            email,
            phone,
            helper_name_singular: helperSingular,
            helper_name_plural: helperPlural,
            logoFile,
            removeLogo: false 
        });
    };

    const handleSaveWithLogoRemove = () => {
        updateMutation.mutate({ 
            name, 
            description, 
            removeLogo: true 
        });
    };

    const handleUserProfileClick = (userId: string) => {
        setSelectedUserId(userId);
        setIsProfileDialogOpen(true);
    };

    const handleCloseProfileDialog = () => {
        setIsProfileDialogOpen(false);
        setSelectedUserId(null);
    };

    if (isLoading || orgLoading) return <div className="p-6">Lädt Organisation...</div>;
    if (error || orgError) return <div className="p-6">Fehler beim Laden der Organisation</div>;

    return (
      <div className="w-full max-w-screen-xl mx-auto bg-white rounded-lg outline outline-1 outline-offset-[-1px] outline-slate-200 flex flex-col">
        <div className="w-full p-4 border-b border-slate-200 flex justify-between items-center gap-8">
        <div className="flex-1 h-8 flex justify-center items-center gap-2.5">
            <div className="flex-1 justify-start text-slate-800 text-2xl font-semibold font-['Poppins'] leading-loose">Einstellungen</div>
        </div>
        <div className="flex justify-end items-center gap-2">
            <button data-state="Default" data-type="outline" className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
                 onClick={() => router.push(`/settings`)}>
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
                                <div data-left-icon="true" data-right-icon="false" data-right-text="true" data-state="default" data-type="default" className="self-stretch px-2 py-1.5 rounded-md inline-flex justify-start items-center gap-2">
                                    <div className="w-4 h-4 relative overflow-hidden">
                                        <SettingsIcon className="w-4 h-4 relative overflow-hidden" />
                                    </div>
                                    <div className="flex-1 justify-start  text-base font-medium font-['Inter'] leading-normal">
                                      <button onClick={() => router.push(`/settings`)}>
                                        Allgemein
                                      </button>
                                    </div>
                                    <div className="justify-start"></div>
                                </div>
                                <div className="self-stretch h-px bg-slate-200" />
                                <div className="justify-start text-slate-700 text-sm font-semibold font-['Inter'] leading-tight">Organisationsverwaltung</div>
                                {(() => {
                                  const allOrgs: any[] = Array.isArray(user?.organizations) ? user!.organizations : [];
                                  const managedOrgs = allOrgs.filter((org: any) => {
                                    if (!Array.isArray(org.roles)) return false;
                                    return org.roles.some((role: any) => {
                                      const roleName = typeof role === 'string' ? role : role?.name || '';
                                      const roleAbbr = typeof role === 'string' ? '' : role?.abbreviation || '';
                                      const nameLower = roleName.toLowerCase();
                                      const abbrLower = roleAbbr.toLowerCase();
                                      return nameLower.includes('organisationsverwaltung') ||
                                             nameLower.includes('superadmin') ||
                                             abbrLower === 'ov' ||
                                             nameLower === 'ov';
                                    });
                                  });

                                  if (managedOrgs.length > 0) {
                                    return managedOrgs.map((org: any) => (
                                      <button
                                        key={org.id}
                                        onClick={() => router.push(`/organization/${org.id}/manage`)}
                                        className={`w-full text-left px-2 py-1.5 rounded-md inline-flex justify-start items-center gap-2 transition-colors ${
                                          org.id === orgId 
                                            ? 'bg-slate-100 text-slate-900 font-medium' 
                                            : 'bg-white hover:bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        <OrganisationIcon />
                                       <div className="flex-1 justify-start text-base font-medium font-['Inter'] leading-normal">{org.name}</div>
                                      </button>
                                    ));
                                  }
                                  return <div className="px-2 py-1.5 text-xs text-gray-400">Keine Berechtigung</div>;
                                })()}
                  </div>
                <div className="w-64 px-2 py-1.5 rounded-bl-lg rounded-br-lg flex flex-col justify-start items-start gap-2">
                    <div data-state="Default" data-type="with icon" className="self-stretch px-4 py-2 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 inline-flex justify-center items-center gap-2"
                        onClick={handleSignOut}>
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
                    <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">{name} verwalten</div>
                </div>
                <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 flex flex-col justify-start items-start gap-2">
                        <div className="inline-flex justify-start items-center gap-2">
                            <div className="w-40 h-11 relative overflow-hidden flex items-center justify-center">
                                {logoUrl ? (
                                    <img 
                                        src={logoUrl} 
                                        alt={`${name} Logo`}
                                        className="max-w-full max-h-full object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                ) : null}
                                <div className={`w-40 h-11 bg-slate-200 rounded-md flex items-center justify-center ${logoUrl ? 'hidden' : ''}`}>
                                    <div className="text-slate-700 text-xl font-semibold">
                                        {name ? name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 3) : 'ORG'}
                                    </div>
                                </div>
                            </div>
                            <div className="inline-flex flex-col justify-center items-start">
                                <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-normal">{name || ''}</div>
                            </div>
                        </div>
                        <div className="inline-flex justify-end items-start gap-2">
                           {/* Hidden File Input */}
                           <input
                               type="file"
                               accept="image/*"
                               onChange={handleLogoUpload}
                               className="hidden"
                               id="logo-upload"
                           />
                           {/* Logo Upload Button */}
                           <button
                               type="button"
                               className="px-4 py-2 bg-slate-900 text-white rounded-md inline-flex justify-center items-center gap-2"
                               onClick={() => document.getElementById('logo-upload')?.click()}
                           >
                               <UploadProfilePictureIcon />
                               <span>Logo Hochladen</span>
                           </button>
                           
                           {/* Logo Entfernen Button - nur anzeigen wenn Logo vorhanden */}
                           {logoUrl && (
                               <button
                                   type="button" 
                                   className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5"
                                   onClick={handleLogoRemove}
                               >
                                   <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Logo Entfernen</div>
                               </button>
                           )}
                           
                        </div>

                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-60 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Organisationsname</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 text-slate-900 text-base font-normal font-['Inter'] leading-normal"
                                        placeholder="Organisationsname"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">

                        <div className="flex-1 min-w-60 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">E-Mail</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                                              <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 text-slate-900 text-base font-normal font-['Inter'] leading-normal"
                                placeholder="E-Mail"  
                              />
                              </div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-60 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Telefon</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                                              <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 text-slate-900 text-base font-normal font-['Inter'] leading-normal"
                                placeholder="Telefon"  
                              />
                              </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div data-helper-text="false" data-label="true" data-state="Default" data-type="default" className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                                <div className="justify-start text-black text-sm font-medium font-['Inter'] leading-none">Beschreibung</div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full max-w-prose px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 text-slate-900 text-sm font-normal font-['Inter'] leading-tight resize-y min-h-[120px]"
                                    placeholder="Beschreibung der Organisation..."
                                />
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 pt-2 inline-flex justify-end items-start gap-2">
                        <div data-state="Default" data-type="outline" className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Abbrechen</div>
                        </div>
                        <div data-state="Default" data-type="default" className="px-4 py-2 bg-slate-900 rounded-md flex justify-center items-center gap-2.5" onClick={handleSave}>
                            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
                    <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">Präferenzen</div>
                </div>
                <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-60 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Helfer:in Bezeichnung (Singular)</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <input
                                        type="text"
                                        value={helperSingular}
                                        onChange={(e) => setHelperSingular(e.target.value)}
                                        className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 text-slate-900 text-base font-normal font-['Inter'] leading-normal"
                                        placeholder="Helfer:in"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 min-w-60 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-tight">Helfer:innen Bezeichnung (Plural)</div>
                            <div className="self-stretch inline-flex justify-start items-start gap-2">
                                <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                    <input
                                        type="text"
                                        value={helperPlural}
                                        onChange={(e) => setHelperPlural(e.target.value)}
                                        className="self-stretch pl-3 pr-14 py-2 bg-white rounded-md outline outline-1 outline-slate-300 text-slate-900 text-base font-normal font-['Inter'] leading-normal"
                                        placeholder="Helfer:innen"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 pt-2 inline-flex justify-end items-start gap-2">
                        <div data-state="Default" data-type="outline" className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Abbrechen</div>
                        </div>
                        <div data-state="Default" data-type="default" className="px-4 py-2 bg-slate-900 rounded-md flex justify-center items-center gap-2.5" onClick={handleSave}>
                            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
                    <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">Personeneigenschaften</div>
                </div>
                <div className="self-stretch py-4 border-t border-slate-200 flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 flex flex-col justify-start items-start gap-4">
                        <div className="self-stretch inline-flex justify-center items-center gap-2.5">
                            <div className="flex-1 justify-start text-slate-600 text-sm font-medium font-['Inter'] leading-tight">Erstelle ein neues Eigenschaftsfeld, um Personen deiner Organisation Eigenschaften zuzuweisen. Beispielsweise kannst du festlegen, dass jeder Einsatz mindestens eine Person mit Schlüssel erfordert. </div>
                        </div>
                        <div className="self-stretch px-4 flex flex-col justify-center items-center gap-2.5">
{/*                             <div className="w-60 h-52 relative">
                                <div className="w-[3.40px] h-[3.39px] left-[188.66px] top-[51.57px] absolute bg-slate-300" />
                                <div className="w-[3.40px] h-[3.39px] left-[23.13px] top-[51.57px] absolute bg-slate-300" />
                                <div className="w-[3.40px] h-[3.39px] left-[165.59px] top-[36.27px] absolute bg-slate-300" />
                                <div className="w-7 h-7 left-[124.74px] top-[4.65px] absolute bg-slate-300" />
                                <div className="w-6 h-5 left-[126.38px] top-[6.27px] absolute bg-white" />
                                <div className="w-2.5 h-2.5 left-[133.05px] top-[12.35px] absolute bg-slate-500" />
                                <div className="w-14 h-3.5 left-[141.68px] top-[1.70px] absolute bg-gray-700" />
                                <div className="w-2.5 h-2.5 left-[191.91px] top-[2.06px] absolute bg-gray-700" />
                                <div className="w-6 h-0.5 left-[206.31px] top-[11.43px] absolute bg-slate-500" />
                                <div className="w-6 h-0.5 left-[206.31px] top-[21.25px] absolute bg-slate-300" />
                                <div className="w-12 h-0.5 left-[206.31px] top-[16.34px] absolute bg-slate-300" />
                                <div className="w-7 h-7 left-[115.63px] top-[43.23px] absolute bg-slate-300" />
                                <div className="w-6 h-5 left-[117.27px] top-[44.85px] absolute bg-white" />
                                <div className="w-2.5 h-2.5 left-[125.13px] top-[50.59px] absolute bg-slate-500" />
                                <div className="w-6 h-0.5 left-[157.78px] top-[75.05px] absolute bg-slate-500" />
                                <div className="w-6 h-0.5 left-[157.78px] top-[84.88px] absolute bg-slate-300" />
                                <div className="w-12 h-0.5 left-[157.78px] top-[79.97px] absolute bg-slate-300" />
                                <div className="w-6 h-4 left-[128.96px] top-[54.61px] absolute bg-gray-700" />
                                <div className="w-3 h-3 left-[143.17px] top-[64.08px] absolute bg-gray-700" />
                                <div className="w-7 h-7 left-[23.28px] top-[1.69px] absolute bg-slate-300" />
                                <div className="w-6 h-5 left-[24.92px] top-[3.31px] absolute bg-white" />
                                <div className="w-2.5 h-2.5 left-[31.59px] top-[9.72px] absolute bg-slate-500" />
                                <div className="w-6 h-0.5 left-[-11px] top-[41.38px] absolute bg-slate-500" />
                                <div className="w-6 h-0.5 left-[-11px] top-[51.21px] absolute bg-slate-300" />
                                <div className="w-12 h-0.5 left-[-11px] top-[46.29px] absolute bg-slate-300" />
                                <div className="w-4 h-6 left-[20.33px] top-[14.15px] absolute bg-gray-700" />
                                <div className="w-3 h-3 left-[16.89px] top-[28.96px] absolute bg-gray-700" />
                                <div className="w-[1.20px] h-[2.84px] left-[81.32px] top-[191.60px] absolute bg-gradient-to-l from-zinc-500/25 via-zinc-500/10 to-zinc-500/10" />
                                <div className="w-3.5 h-3 left-[76.18px] top-[58.70px] absolute bg-red-300" />
                                <div className="w-2 h-3 left-[118.92px] top-[54.49px] absolute bg-red-300" />
                                <div className="w-2 h-1.5 left-[71.95px] top-[192.33px] absolute bg-red-300" />
                                <div className="w-4 h-2.5 left-[82.42px] top-[186.46px] absolute bg-slate-800" />
                                <div className="w-7 h-16 left-[72.10px] top-[118.80px] absolute bg-slate-700" />
                                <div className="w-7 h-20 left-[71.34px] top-[119.97px] absolute bg-slate-700" />
                                <div className="w-5 h-5 left-[76.49px] top-[46.09px] absolute bg-red-300" />
                                <div className="w-8 h-14 left-[66.71px] top-[67.72px] absolute bg-slate-500" />
                                <div className="w-8 h-6 left-[91.77px] top-[63.09px] absolute bg-slate-500" />
                                <div className="w-7 h-5 left-[63.08px] top-[66.21px] absolute bg-slate-500" />
                                <div className="w-7 h-5 left-[63.08px] top-[66.21px] absolute opacity-5 bg-slate-900" />
                                <div className="w-6 h-2.5 left-[69.80px] top-[194.18px] absolute bg-slate-800" />
                                <div className="w-0.5 h-[0.34px] left-[75.25px] top-[56.56px] absolute opacity-10 bg-slate-900" />
                                <div className="w-6 h-5 left-[72.19px] top-[42.45px] absolute origin-top-left rotate-[-6.99deg] bg-slate-800" />
                                <div className="w-10 h-16 left-[94.93px] top-[-17.76px] absolute origin-top-left rotate-[15deg] overflow-hidden">
                                    <div className="w-6 h-8 left-[13.97px] top-[15.92px] absolute origin-top-left rotate-3 bg-slate-300" />
                                </div>
                                <div className="w-2.5 h-5 left-[71px] top-[9.31px] absolute origin-top-left rotate-[-12.79deg] bg-slate-300" />
                            </div> */}
                                                    <Image
                            src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/undraw_instant-analysis_vm8x%201.svg"
                            alt=""
                            width={245}
                            height={210}
                            unoptimized
                        />
                        </div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div data-state="Default" data-type="with icon" className="flex-1 px-4 py-5 bg-slate-50 rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2">
                            <div className="w-4 h-4 relative overflow-hidden">
                                <div className="w-0 h-2.5 left-[8px] top-[3.33px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
                                <div className="w-2.5 h-0 left-[3.33px] top-[8px] absolute outline outline-2 outline-offset-[-1px] outline-slate-900" />
                            </div>
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Neue Eigenschaft Anlegen</div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 pt-2 inline-flex justify-end items-start gap-2">
                        <div data-state="Default" data-type="outline" className="px-4 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
                            <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Abbrechen</div>
                        </div>
                        <div data-state="Default" data-type="default" className="px-4 py-2 bg-slate-900 rounded-md flex justify-center items-center gap-2.5" onClick={handleSave}>
                            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="self-stretch flex flex-col justify-center items-start gap-4">
            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                <div className="self-stretch px-4 pt-2 inline-flex justify-start items-center gap-2.5">
                    <div className="justify-start text-slate-900 text-sm font-semibold font-['Inter'] leading-tight">Personen verwalten</div>
                </div>
                <div className="self-stretch py-2 border-t border-slate-200 flex flex-col justify-start items-start gap-5">
                    {usersLoading ? (
                        <div className="self-stretch px-4 text-center py-4 text-gray-500">Lädt User...</div>
                    ) : usersData && usersData.length > 0 ? (
                        (() => {
                            // Gruppiere nach User-ID um mehrere Rollen zu sammeln
                            const groupedUsers = usersData.reduce((acc: any, userOrgRole: any) => {
                                const userId = userOrgRole.user?.id;
                                if (!acc[userId]) {
                                    acc[userId] = {
                                        user: userOrgRole.user,
                                        roles: []
                                    };
                                }
                                acc[userId].roles.push(userOrgRole.role);
                                return acc;
                            }, {});

                            return Object.values(groupedUsers).map((groupedUser: any) => (
                                <div key={groupedUser.user?.id} className="self-stretch px-4 inline-flex justify-between items-center">
                                    <div className="flex justify-start items-start gap-2">
                                        <div className="w-10 h-10 px-2 py-1.5 bg-slate-200 rounded-[20px] inline-flex flex-col justify-center items-center gap-2.5">
                                            <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">
                                                {(() => {
                                                    const name = groupedUser.user?.firstname && groupedUser.user?.lastname 
                                                        ? `${groupedUser.user.firstname} ${groupedUser.user.lastname}`
                                                        : groupedUser.user?.email || '?';
                                                    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                                                })()}
                                            </div>
                                        </div>
                                        <div className="inline-flex flex-col justify-center items-start gap-0.5">
                                            <div className="justify-start text-slate-800 text-xl font-normal font-['Inter'] leading-7">
                                                {groupedUser.user?.firstname && groupedUser.user?.lastname 
                                                    ? `${groupedUser.user.firstname} ${groupedUser.user.lastname}`
                                                    : groupedUser.user?.email || 'Unbekannt'}
                                            </div>
                                            <div className="inline-flex justify-start items-start gap-1">
                                                {groupedUser.roles.map((role: any, index: number) => (
                                                    <div key={index} className={`p-1 rounded-md flex justify-center items-center gap-2.5 ${
                                                        role?.name === 'Superadmin' ? 'bg-rose-400' :
                                                        role?.name === 'Organisationsverwaltung' || role?.abbreviation === 'OV' ? 'bg-red-300' :
                                                        role?.name === 'Einsatzverwaltung' || role?.abbreviation === 'EV' ? 'bg-orange-300' :
                                                        'bg-cyan-200'
                                                    }`}>
                                                        <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">
                                                            {role?.abbreviation || role?.name || 'Unbekannt'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button
                                        onClick={() => handleUserProfileClick(groupedUser.user?.id)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md flex justify-center items-center gap-2.5 transition-colors"
                                    >
                                        <div className="justify-start text-slate-900 text-sm font-medium font-['Inter'] leading-normal">Profil Verwalten</div>
                                        
                                    </button>
                                </div>
                            ));
                        })()
                    ) : (
                        <div className="self-stretch px-4 text-center py-4 text-gray-500">Keine User gefunden</div>
                    )}
                </div>
            </div>
            
            {(() => {
    // Sammle ALLE Rollen des Users
    const currentUserRoles = usersData?.filter((userOrgRole: any) => {
        return userOrgRole.user?.email === session?.user?.email;
    });
    
    const roleNames = currentUserRoles?.map((r: { role: { name: any; abbreviation: any; }; }) => r.role?.name || r.role?.abbreviation) || [];
    const canInviteUsers = roleNames.includes('Organisationsverwaltung') || 
                          roleNames.includes('OV') || 
                          roleNames.includes('Superadmin');
    
    return (
        <div className="self-stretch px-4 py-4 border-t border-slate-200 flex flex-col gap-4">
{/* {            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <h4 className="font-semibold text-yellow-800">Debug Info:</h4>
                <p className="text-sm text-yellow-700">User Roles: {roleNames.join(', ')}</p>
                <p className="text-sm text-yellow-700">Can Invite: {canInviteUsers ? 'Ja' : 'Nein'}</p>
            </div>} */}
            
            {canInviteUsers && (
                <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Helfer einladen
                </button>
            )}
        </div>
    );
})()}
            </div>

            {selectedUserId && (
                <UserProfileDialog
                    isOpen={isProfileDialogOpen}
                    onClose={handleCloseProfileDialog}
                    userId={selectedUserId}
                    organizationId={orgId}
                />
            )}

            {/* Modal - IMMER rendern für Debug */}
            <InviteUserForm
                organizationId={orgId}
                isOpen={isInviteModalOpen}
                onClose={() => {
                    console.log('Modal closing...');
                    setIsInviteModalOpen(false);
                }}
            />
        </div>
    </div>
        </div>
    );
}
