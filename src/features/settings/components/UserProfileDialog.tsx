'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SwitchIcon from '@/components/icon/SwitchIcon';

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
  hasGetMailNotification: boolean;
  role: {
    id: string;
    name: string;
    abbreviation: string;
  };
  organization: {
    id: string;
    name: string;
    helper_name_singular: string;
    helper_name_plural: string;
  };
}

export function UserProfileDialog({ 
  isOpen, 
  onClose, 
  userId, 
  organizationId 
}: UserProfileDialogProps) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);

  // Disable background scroll + ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const preventTouch = (e: Event) => e.preventDefault();
    document.addEventListener('touchmove', preventTouch, { passive: false });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prevOverflow || '';
      document.removeEventListener('touchmove', preventTouch);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  // Fetch user profile
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['userProfile', userId, organizationId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/profile?orgId=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json() as UserProfile;
    },
    enabled: isOpen && !!userId && !!organizationId
  });

  // Initialize form data when user profile loads
  useEffect(() => {
    if (userProfile) {
      // Parse user roles based on role name/abbreviation
      const roles: string[] = [];
      const roleName = userProfile.role?.name || userProfile.role?.abbreviation || '';
      
      if (roleName === 'Superadmin' || roleName === 'SuperAdmin') {
        roles.push('OV', 'EV', 'Helfer');
      } else if (roleName === 'Organisationsverwaltung' || roleName === 'OV') {
        roles.push('OV');
      } else if (roleName === 'Einsatzverwaltung' || roleName === 'EV') {
        roles.push('EV');
      } else if (roleName === 'Helfer:in' || roleName === 'Helfer') {
        roles.push('Helfer');
      }
      
      setUserRoles(roles);
      setHasKey(false); // TODO: Load from user data when available
    }
  }, [userProfile]);

  // Toggle role mutation
  const toggleRoleMutation = useMutation({
    mutationFn: async ({ role, isActive }: { role: string; isActive: boolean }) => {
      const res = await fetch(`/api/users/${userId}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organizationId, 
          role, 
          action: isActive ? 'add' : 'remove' 
        })
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['organizationUsers'] });
    }
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organization/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId })
      });
      if (!res.ok) throw new Error('Failed to remove user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizationUsers'] });
      onClose();
    }
  });

  const toggleRole = async (roleAbbreviation: string) => {
    setSaving(true);
    try {
      const isCurrentlyActive = userRoles.includes(roleAbbreviation);
      
      // Optimistic update
      if (isCurrentlyActive) {
        setUserRoles(prev => prev.filter(role => role !== roleAbbreviation));
      } else {
        setUserRoles(prev => [...prev, roleAbbreviation]);
      }

      await toggleRoleMutation.mutateAsync({
        role: roleAbbreviation,
        isActive: !isCurrentlyActive
      });

    } catch (error) {
      console.error('Error toggling role:', error);
      // Revert optimistic update on error
      if (userProfile) {
        const roles: string[] = [];
        const roleName = userProfile.role?.name || userProfile.role?.abbreviation || '';
        
        if (roleName === 'Superadmin') {
          roles.push('OV', 'EV', 'Helfer');
        } else if (roleName === 'Organisationsverwaltung' || roleName === 'OV') {
          roles.push('OV');
        } else if (roleName === 'Einsatzverwaltung' || roleName === 'EV') {
          roles.push('EV');
        } else if (roleName === 'Helfer:in' || roleName === 'Helfer') {
          roles.push('Helfer');
        }
        
        setUserRoles(roles);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = () => {
    if (confirm(`Möchten Sie ${userProfile?.firstname} ${userProfile?.lastname} wirklich aus der Organisation entfernen?`)) {
      removeUserMutation.mutate();
    }
  };

  const handlePromoteToSuperadmin = async () => {
    if (confirm(`Möchten Sie ${userProfile?.firstname} ${userProfile?.lastname} wirklich zum Superadmin ernennen?`)) {
      // TODO: Implement superadmin promotion
      console.log('Promote to superadmin not implemented yet');
    }
  };

  if (!isOpen) return null;

  // Loading state
  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm" />
        <div className="relative bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Lädt Benutzerdaten...</span>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Error state
  if (error) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="fixed inset-0 bg-white/20 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-2xl p-8 border border-red-200">
          <div className="text-red-600 font-medium">
            Fehler beim Laden der Benutzerdaten
          </div>
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Schließen
          </button>
        </div>
      </div>,
      document.body
    );
  }

  if (!userProfile) return null;

  // Generate initials
  const initials = `${userProfile.firstname?.[0] || ''}${userProfile.lastname?.[0] || ''}`.toUpperCase() || 'U';

  const content = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white/20 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-[656px] h-[1024px] px-4 relative bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] inline-flex justify-start items-center gap-2.5 rounded-lg overflow-hidden"
      >
        <div className="flex-1 h-[740px] flex justify-start items-start gap-2 overflow-y-auto">
          <div className="flex-1 inline-flex flex-col justify-start items-start gap-8">
            {/* User Header */}
            <div className="px-4 flex flex-col justify-start items-start gap-2">
              <div className="w-16 h-16 px-3 py-2 rounded-[30px] flex flex-col justify-center items-center gap-3.5">
                {userProfile.picture_url ? (
                  <img 
                    src={userProfile.picture_url} 
                    alt={`${userProfile.firstname} ${userProfile.lastname}`}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center items-start gap-1">
                <div className="justify-start text-slate-800 text-2xl font-semibold font-['Inter'] leading-loose">
                  {userProfile.firstname} {userProfile.lastname}
                </div>
                <div className="inline-flex justify-start items-start gap-1">
                  {userRoles.includes('OV') && (
                    <div className="p-1 bg-red-300 rounded-md flex justify-center items-center gap-2.5">
                      <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Organisationsverwaltung</div>
                    </div>
                  )}
                  {userRoles.includes('EV') && (
                    <div className="p-1 bg-orange-300 rounded-md flex justify-center items-center gap-2.5">
                      <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Einsatzverwaltung</div>
                    </div>
                  )}
                  {userRoles.includes('Helfer') && (
                    <div className="p-1 bg-blue-300 rounded-md flex justify-center items-center gap-2.5">
                      <div className="justify-start text-slate-700 text-sm font-medium font-['Inter'] leading-none">Helfer:in</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
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
                  <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
                    {userProfile.email}
                  </div>
                </div>
                {userProfile.phone && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="w-4 h-4 relative overflow-hidden">
                      <div className="w-3.5 h-3.5 left-[1.41px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
                    </div>
                    <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
                      {userProfile.phone}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Properties */}
            <div className="self-stretch flex flex-col justify-center items-start">
              <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-start items-center gap-2">
                <div className="flex-1 flex justify-start items-center gap-2">
                  <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Personeneigenschaften</div>
                  <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
                    {userProfile.organization?.name}
                  </div>
                </div>
              </div>
              <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                  <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Person hat Schlüssel?</div>
                    <button
                      onClick={() => setHasKey(!hasKey)}
                      className="cursor-pointer"
                    >
                      <SwitchIcon isOn={hasKey} />
                    </button>
                  </div>
                </div>
                <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                  <div className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="self-stretch flex flex-col justify-start items-start gap-2">
                      <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none">Anmerkung</div>
                      <textarea
                        className="w-full h-20 px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 resize-none"
                        placeholder="Anmerkung hier eingeben"
                        value={userProfile.description || ''}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Rollen */}
            <div className="self-stretch flex flex-col justify-center items-start">
              <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                <div className="flex-1 flex justify-start items-center gap-2">
                  <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Rollen</div>
                  <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
                    {userProfile.organization?.name}
                  </div>
                </div>
              </div>
              
              {/* OV Rolle */}
              <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                  <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Organisationsverwaltung (OV)</div>
                    <button
                      onClick={() => toggleRole('OV')}
                      disabled={saving}
                      className="cursor-pointer disabled:opacity-50"
                    >
                      <SwitchIcon isOn={userRoles.includes('OV')} disabled={saving} />
                    </button>
                  </div>
                </div>
              </div>

              {/* EV Rolle */}
              <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                  <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Einsatzverwaltung (EV)</div>
                    <button
                      onClick={() => toggleRole('EV')}
                      disabled={saving}
                      className="cursor-pointer disabled:opacity-50"
                    >
                      <SwitchIcon isOn={userRoles.includes('EV')} disabled={saving} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Helfer Rolle */}
              <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                  <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                    <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Helfer:in (Helfer:in)</div>
                    <button
                      onClick={() => toggleRole('Helfer')}
                      disabled={saving}
                      className="cursor-pointer disabled:opacity-50"
                    >
                      <SwitchIcon isOn={userRoles.includes('Helfer')} disabled={saving} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Gefahrenzone */}
            <div className="self-stretch flex flex-col justify-center items-start">
              <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                <div className="flex-1 flex justify-start items-center gap-2">
                  <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Gefahrenzone!</div>
                  <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">
                    {userProfile.organization?.name}
                  </div>
                </div>
              </div>
              <div className="self-stretch flex flex-col justify-center items-start">
                <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                  <div className="px-4 pt-2 flex justify-start items-start gap-2">
                    <button 
                      onClick={handleRemoveUser}
                      disabled={removeUserMutation.isPending}
                      className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <div className="w-4 h-4 relative overflow-hidden">
                        <div className="w-3 h-0 left-[2px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                        <div className="w-2.5 h-2.5 left-[3.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                        <div className="w-1.5 h-[2.67px] left-[5.33px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                      </div>
                      <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
                        {removeUserMutation.isPending ? 'Entfernt...' : 'Aus Organisation Entfernen'}
                      </div>
                    </button>
                    <button 
                      onClick={handlePromoteToSuperadmin}
                      className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors"
                    >
                      <div className="w-4 h-4 relative overflow-hidden">
                        <div className="w-3.5 h-2.5 left-[1.33px] top-[2.67px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-white" />
                      </div>
                      <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Zu Superadmin Ernennen</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Header Buttons */}
        <div className="w-[592px] left-[32px] top-[28px] absolute flex justify-end items-center gap-10">
          <div className="flex justify-end items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5 hover:bg-gray-50 transition-colors"
            >
              <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-normal">Schließen (ESC)</div>
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1 bg-slate-900 rounded-md flex justify-center items-center gap-2.5 disabled:opacity-50 hover:bg-slate-800 transition-colors"
            >
              <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">
                {saving ? 'Speichert...' : 'Speichern & Schließen'}
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}