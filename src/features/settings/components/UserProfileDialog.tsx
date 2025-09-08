// Neue Datei: src/components/settings/UserProfileDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Phone, User, Shield, Calendar, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';

interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  organizationId: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string | null;
  picture_url: string | null;
  description: string | null;
  hasLogoinCalendar: boolean;
  created_at: string;
  last_login: string | null;
  // Organization-specific data
  role: {
    id: string;
    name: string;
    abbreviation: string;
  };
  hasGetMailNotification: boolean;
  joined_at: string;
}

export function UserProfileDialog({ 
  isOpen, 
  onClose, 
  userId, 
  organizationId 
}: UserProfileDialogProps) {
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  // ESC Key Handler
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      // Verhindere Scrollen im Hintergrund
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Fetch user profile
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['userProfile', userId, organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/profile?orgId=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json();
    },
    enabled: isOpen && !!userId
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const res = await fetch(`/api/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, organizationId })
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['organizationUsers'] });
      setIsEditing(false);
    }
  });

  // Remove user from organization
  const removeUserMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/users/${userId}/organizations/${organizationId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationUsers'] });
      onClose();
    }
  });

  useEffect(() => {
    if (userProfile) {
      setFormData(userProfile);
    }
  }, [userProfile]);

  if (!isOpen) return null;

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSave = () => {
    updateUserMutation.mutate(formData);
  };

  const handleRemoveUser = () => {
    if (confirm('Möchten Sie diesen Benutzer wirklich aus der Organisation entfernen?')) {
      removeUserMutation.mutate();
    }
  };

  const canEdit = can('users:update');
  const canRemove = can('users:delete');

  return (
<div className="w-[656px] h-[1024px] px-4 relative bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] inline-flex justify-start items-center gap-2.5">
    <div className="flex-1 h-[740px] flex justify-start items-start gap-2">
        <div className="flex-1 inline-flex flex-col justify-start items-start gap-8">
            <div className="px-4 flex flex-col justify-start items-start gap-2">
                <div data-type="avatar initials" className="w-14 h-14 px-3 py-2 bg-slate-200 rounded-[30px] flex flex-col justify-center items-center gap-3.5">
                    <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">JD</div>
                </div>
                <div className="flex flex-col justify-center items-start gap-1">
                    <div className="justify-start text-slate-800 text-2xl font-semibold font-['Inter'] leading-loose">John Doe</div>
                    <div className="inline-flex justify-start items-start gap-1">
                        <div className="p-1 bg-red-300 rounded-md flex justify-center items-center gap-2.5">
                            <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Organisationsverwaltung</div>
                        </div>
                        <div className="p-1 bg-orange-300 rounded-md flex justify-center items-center gap-2.5">
                            <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Einsatzverwaltung</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="px-4 flex flex-col justify-center items-start gap-2.5">
                <div className="w-96 inline-flex justify-start items-center gap-2.5">
                    <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Kontaktinformationen</div>
                </div>
                <div className="inline-flex justify-center items-center gap-4">
                    <div className="flex justify-start items-center gap-2">
                        <div className="w-4 h-4 relative overflow-hidden">
                            <div className="w-3.5 h-2.5 left-[1.33px] top-[2.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
                            <div className="w-3.5 h-1 left-[1.33px] top-[4.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
                        </div>
                        <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">john.doe@jm-hohenems.at</div>
                    </div>
                    <div className="flex justify-start items-center gap-2">
                        <div className="w-4 h-4 relative overflow-hidden">
                            <div className="w-3.5 h-3.5 left-[1.41px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
                        </div>
                        <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">+43 123 4567890</div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-start items-center gap-2">
                    <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Personeneigenschaften </div>
                        <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">Jüdisches Museum Hohenems</div>
                    </div>
                </div>
                <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Person hat Schlüssel?</div>
                            <div data-state="off" className="inline-flex justify-start items-center gap-2">
                                <div className="w-11 h-6 bg-slate-200 rounded-[50px]" />
                                <div className="w-5 h-5 bg-white rounded-full" />
                                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none"> </div>
                            </div>
                        </div>
                    </div>
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div data-helper-text="false" data-label="true" data-state="Default" data-type="default" className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="self-stretch flex flex-col justify-start items-start gap-2">
                                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none">Anmerkung</div>
                                <div className="w-[592px] h-20 px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 inline-flex justify-start items-start gap-2.5">
                                    <div className="flex-1 justify-start text-slate-400 text-sm font-normal font-['Inter'] leading-tight">Anmerkung hier eingeben ...</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                    <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Rollen</div>
                        <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">Jüdisches Museum Hohenems</div>
                    </div>
                </div>
                <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Organisationsverwaltung (OV)</div>
                            <div data-state="on" className="inline-flex justify-start items-center gap-2">
                                <div className="w-11 h-6 bg-slate-900 rounded-[50px]" />
                                <div className="w-5 h-5 bg-white rounded-full" />
                                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none"> </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Einsatzverwaltung (EV)</div>
                            <div data-state="on" className="inline-flex justify-start items-center gap-2">
                                <div className="w-11 h-6 bg-slate-900 rounded-[50px]" />
                                <div className="w-5 h-5 bg-white rounded-full" />
                                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none"> </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                    <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                        <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Helfer:in (Helfer:in)</div>
                            <div data-state="off" className="inline-flex justify-start items-center gap-2">
                                <div className="w-11 h-6 bg-slate-200 rounded-[50px]" />
                                <div className="w-5 h-5 bg-white rounded-full" />
                                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none"> </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                    <div className="flex-1 flex justify-start items-center gap-2">
                        <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Gefahrenzone!</div>
                        <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">Jüdisches Museum Hohenems</div>
                    </div>
                </div>
                <div className="self-stretch flex flex-col justify-center items-start">
                    <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                        <div className="px-4 pt-2 flex justify-start items-start gap-2">
                            <div data-state="Default" data-type="with icon" className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2">
                                <div className="w-4 h-4 relative overflow-hidden">
                                    <div className="w-3 h-0 left-[2px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                    <div className="w-2.5 h-2.5 left-[3.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                    <div className="w-1.5 h-[2.67px] left-[5.33px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                </div>
                                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Aus Organisation Entfernen</div>
                            </div>
                            <div className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2">
                                <div className="w-4 h-4 relative overflow-hidden">
                                    <div className="w-3.5 h-2.5 left-[1.33px] top-[2.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white" />
                                </div>
                                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Zu Superadmin Ernennen</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div className="w-[592px] left-[32px] top-[28px] absolute flex justify-end items-center gap-10">
        <div className="flex justify-end items-center gap-2">
            <div data-state="Default" data-type="outline" className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5">
                <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-normal">Schließen (ESC)</div>
            </div>
            <div data-state="Default" data-type="default" className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5">
                <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Speichern & Schließen</div>
            </div>
        </div>
    </div>
</div>
  );
}