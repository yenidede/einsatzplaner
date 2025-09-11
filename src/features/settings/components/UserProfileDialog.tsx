'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import SwitchIcon from '@/components/icon/SwitchIcon';

interface UserProfileDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    organizationId: string;
}

export function UserProfileDialog({
    isOpen,
    onClose,
    userId,
    organizationId
}: UserProfileDialogProps) {
    const [userInitialData, setUserInitialData] = useState<any>(null);
    const [userRoles, setUserRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const dialogRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserData();
        }
    }, [isOpen, userId, organizationId]);

    // Disable background scroll + prevent touchmove on iOS while modal open
    useEffect(() => {
        if (!isOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const preventTouch = (e: Event) => e.preventDefault();
        document.addEventListener('touchmove', preventTouch, { passive: false });

        return () => {
            document.body.style.overflow = prevOverflow || '';
            document.removeEventListener('touchmove', preventTouch);
        };
    }, [isOpen]);

    // ESC to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        if (isOpen) document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            console.log('=== FETCH USER DATA DEBUG ===');
            console.log('Organization ID:', organizationId);
            console.log('User ID:', userId);
            console.log('API URL:', `/api/users/${userId}/profile?orgId=${organizationId}`);
            
            // Nutze nur deine bestehende Profile-API
            const userResponse = await fetch(`/api/users/${userId}/profile?orgId=${organizationId}`);
            console.log('Response status:', userResponse.status);
            console.log('Response ok:', userResponse.ok);
            
            if (!userResponse.ok) {
                const errorText = await userResponse.text();
                console.log('Error response:', errorText);
                throw new Error(`Fehler beim Laden der Userdaten: ${userResponse.status} - ${errorText}`);
            }
            
            const userData = await userResponse.json();
            console.log('=== API RESPONSE ===');
            console.log('Full userData:', userData);
            console.log('Role object:', userData.role);
            console.log('Role name:', userData.role?.name);
            console.log('Role abbreviation:', userData.role?.abbreviation);

            setUserInitialData({
                email: userData.email || '',
                firstname: userData.firstname || '',
                lastname: userData.lastname || '',
                phone: userData.phone || '',
                description: userData.description || '',
                hasLogoinCalendar: userData.hasLogoinCalendar || false,
                hasGetMailNotification: userData.hasGetMailNotification || false,
                role: userData.role // Speichere die komplette Rolle für Debug
            });

            // Lade die EINE Rolle die der User in dieser Organisation hat
            const currentRole = userData.role?.abbreviation || userData.role?.name;
            console.log('=== ROLE PROCESSING ===');
            console.log('Current role (raw):', currentRole);
            
            if (currentRole) {
                // Normalisiere Rollennamen zu Abkürzungen
                let normalizedRoles: string[] = [];
                
                // Behandle verschiedene Rollennamen
                if (currentRole === 'Superadmin' || currentRole === 'SuperAdmin') {
                    // Superadmin hat alle Rollen
                    normalizedRoles = ['OV', 'EV', 'Helfer'];
                    console.log('User is Superadmin - setting all roles');
                } else if (currentRole === 'Organisationsverwaltung' || currentRole === 'OV') {
                    normalizedRoles = ['OV'];
                    console.log('User has OV role');
                } else if (currentRole === 'Einsatzverwaltung' || currentRole === 'EV') {
                    normalizedRoles = ['EV'];
                    console.log('User has EV role');
                } else if (currentRole === 'Helfer:in' || currentRole === 'Helfer') {
                    normalizedRoles = ['Helfer'];
                    console.log('User has Helfer role');
                } else {
                    console.log('Unknown role type:', currentRole);
                }
                
                console.log('Final normalized roles:', normalizedRoles);
                setUserRoles(normalizedRoles);
            } else {
                console.log('No role found for user in this organization');
                setUserRoles([]);
            }

        } catch (error) {
            console.error('=== FETCH ERROR ===');
            console.error('Error details:', error);
            console.error('Error message:', error.message);
            
            // Fallback
            setUserInitialData({
                email: 'demo@example.com',
                firstname: 'Demo',
                lastname: 'User',
                phone: '+43 123 456789',
                role: null
            });
            setUserRoles([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = async (roleAbbreviation: string) => {
        setSaving(true);
        try {
            const isCurrentlyActive = userRoles.includes(roleAbbreviation);
            
            console.log(`Toggling role ${roleAbbreviation} for user ${userId} in org ${organizationId}`);
            console.log(`Currently active: ${isCurrentlyActive}`);
            
            // TODO: Hier müsstest du eine echte API erstellen
            // Für jetzt nur lokaler State-Update
            console.log(`Would ${isCurrentlyActive ? 'remove' : 'add'} role ${roleAbbreviation}`);
            
            // Simuliere API-Call delay
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Update local state
            if (isCurrentlyActive) {
                setUserRoles(prev => prev.filter(role => role !== roleAbbreviation));
            } else {
                setUserRoles(prev => [...prev, roleAbbreviation]);
            }

        } catch (error) {
            console.error('Fehler beim Ändern der Rolle:', error);
            alert(`Fehler: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndClose = async () => {
        onClose();
    };

    // Loading state
    if (loading && isOpen) {
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

    if (!isOpen || !userInitialData) return null;

    const content = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop (blur, click closes) */}
            <div
                className="fixed inset-0 bg-white/20 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Dialog wrapper with your exact design */}
            <div
                ref={dialogRef}
                onClick={(e) => e.stopPropagation()}
                className="w-[656px] h-[1024px] px-4 relative bg-white shadow-[0px_4px_6px_0px_rgba(0,0,0,0.09)] inline-flex justify-start items-center gap-2.5 rounded-lg overflow-hidden"
            >
                <div className="flex-1 h-[740px] flex justify-start items-start gap-2 overflow-y-auto">
                    <div className="flex-1 inline-flex flex-col justify-start items-start gap-8">
                        <div className="px-4 flex flex-col justify-start items-start gap-2">
                            <div data-type="avatar initials" className="w-14 h-14 px-3 py-2 bg-slate-200 rounded-[30px] flex flex-col justify-center items-center gap-3.5">
                                <div className="justify-start text-slate-900 text-base font-normal font-['Inter'] leading-7">
                                    {userInitialData.firstname?.[0]}{userInitialData.lastname?.[0]}
                                </div>
                            </div>
                            <div className="flex flex-col justify-center items-start gap-1">
                                <div className="justify-start text-slate-800 text-2xl font-semibold font-['Inter'] leading-loose">
                                    {userInitialData.firstname} {userInitialData.lastname}
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

                        {/* Debug Info */}
                        <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded mx-4">
                            <div className="text-xs text-yellow-800">
                                <strong>Debug Info:</strong><br/>
                                Organization ID: {organizationId}<br/>
                                User ID: {userId}<br/>
                                Current roles: [{userRoles.join(', ')}]<br/>
                                Raw API Response role: {JSON.stringify(userInitialData.role, null, 2)}<br/>
                                API URL: /api/users/{userId}/profile?orgId={organizationId}
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
                                    <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
                                        {userInitialData.email}
                                    </div>
                                </div>
                                <div className="flex justify-start items-center gap-2">
                                    <div className="w-4 h-4 relative overflow-hidden">
                                        <div className="w-3.5 h-3.5 left-[1.41px] top-[1.33px] absolute outline outline-[1.33px] outline-offset-[-0.67px] outline-slate-800" />
                                    </div>
                                    <div className="justify-start text-slate-800 text-base font-normal font-['Inter'] leading-normal">
                                        {userInitialData.phone || '+43 123 4567890'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="self-stretch flex flex-col justify-center items-start">
                            <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-start items-center gap-2">
                                <div className="flex-1 flex justify-start items-center gap-2">
                                    <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Personeneigenschaften </div>
                                    <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">Organisation</div>
                                </div>
                            </div>
                            <div className="self-stretch py-2 flex flex-col justify-start items-start gap-4">
                                <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                                    <div className="flex-1 min-w-72 inline-flex flex-col justify-start items-start gap-1.5">
                                        <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-tight">Person hat Schlüssel?</div>
                                        <SwitchIcon isOn={false} />
                                    </div>
                                </div>
                                <div className="self-stretch px-4 inline-flex justify-start items-start gap-4">
                                    <div data-helper-text="false" data-label="true" data-state="Default" data-type="default" className="flex-1 inline-flex flex-col justify-start items-start gap-1.5">
                                        <div className="self-stretch flex flex-col justify-start items-start gap-2">
                                            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-none">Anmerkung</div>
                                            <textarea
                                                className="w-full h-20 px-3 py-2 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-300 resize-none"
                                                placeholder="Anmerkung hier eingeben"
                                                value={userInitialData.description || ''}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="self-stretch flex flex-col justify-center items-start">
                            <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                                <div className="flex-1 flex justify-start items-center gap-2">
                                    <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Rollen</div>
                                    <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">Organisation</div>
                                </div>
                            </div>
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
                        <div className="self-stretch flex flex-col justify-center items-start">
                            <div className="self-stretch px-4 py-2 border-b border-slate-200 inline-flex justify-between items-center">
                                <div className="flex-1 flex justify-start items-center gap-2">
                                    <div className="justify-start text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">Gefahrenzone!</div>
                                    <div className="justify-start text-slate-600 text-sm font-normal font-['Inter'] leading-tight">Organisation</div>
                                </div>
                            </div>
                            <div className="self-stretch flex flex-col justify-center items-start">
                                <div className="self-stretch py-2 inline-flex justify-start items-start gap-4">
                                    <div className="px-4 pt-2 flex justify-start items-start gap-2">
                                        <button className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors">
                                            <div className="w-4 h-4 relative overflow-hidden">
                                                <div className="w-3 h-0 left-[2px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                                <div className="w-2.5 h-2.5 left-[3.33px] top-[4px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                                <div className="w-1.5 h-[2.67px] left-[5.33px] top-[1.33px] absolute outline outline-2 outline-offset-[-1px] outline-white" />
                                            </div>
                                            <div className="justify-start text-white text-sm font-medium font-['Inter'] leading-normal">Aus Organisation Entfernen</div>
                                        </button>
                                        <button className="px-4 py-2 bg-red-500 rounded-md flex justify-center items-center gap-2 hover:bg-red-600 transition-colors">
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
                <div className="w-[592px] left-[32px] top-[28px] absolute flex justify-end items-center gap-10">
                    <div className="flex justify-end items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1 bg-white rounded-md outline outline-1 outline-offset-[-1px] outline-slate-200 flex justify-center items-center gap-2.5 hover:bg-gray-50 transition-colors"
                        >
                            <div className="justify-start text-slate-800 text-sm font-medium font-['Inter'] leading-normal">Schließen (ESC)</div>
                        </button>
                        <button
                            onClick={handleSaveAndClose}
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