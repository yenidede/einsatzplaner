'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAcceptInvitation } from '../hooks/useInvitation';
import { FormField, Alert, Button, FormSection } from '@/components/SimpleFormComponents';

interface AcceptInviteFormProps {
    token: string;
    invitationData?: {
        email: string;
        firstname: string;
        lastname: string;
        role: string;
        organizationName: string;
        inviterName: string;
    };
}

export default function AcceptInviteForm({ token, invitationData }: AcceptInviteFormProps) {
    const { loading, error, success, acceptInvitation, clearMessages } = useAcceptInvitation();
    const router = useRouter();
    
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        clearMessages();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            // Wird vom Hook behandelt
            return;
        }

        try {
            await acceptInvitation(token, formData.password, formData.confirmPassword);
            
            // Nach erfolgreichem Annehmen zum Login weiterleiten
            setTimeout(() => {
                router.push('/signin?message=invitation-accepted');
            }, 2000);
        } catch (err) {
            // Fehler wird bereits vom Hook behandelt
        }
    };

    if (!invitationData) {
        return (
            <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Einladung nicht gefunden</h2>
                    <p className="text-gray-600">
                        Diese Einladung ist möglicherweise abgelaufen oder wurde bereits verwendet.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Einladung annehmen</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Vervollständigen Sie Ihre Registrierung für {invitationData.organizationName}
                </p>
            </div>

            {/* Einladungsdetails */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">Einladungsdetails</h3>
                <div className="space-y-1 text-sm text-blue-800">
                    <p><strong>Name:</strong> {invitationData.firstname} {invitationData.lastname}</p>
                    <p><strong>E-Mail:</strong> {invitationData.email}</p>
                    <p><strong>Rolle:</strong> {invitationData.role}</p>
                    <p><strong>Organisation:</strong> {invitationData.organizationName}</p>
                    <p><strong>Eingeladen von:</strong> {invitationData.inviterName}</p>
                </div>
            </div>
            
            {error && (
                <Alert type="error" message={error} onClose={clearMessages} />
            )}
            
            {success && (
                <Alert type="success" message={success} onClose={clearMessages} />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <FormSection title="Passwort festlegen">
                    <FormField
                        label="Passwort"
                        type="password"
                        value={formData.password}
                        onChange={(value) => updateField('password', value)}
                        required
                        placeholder="Mindestens 8 Zeichen"
                    />

                    <FormField
                        label="Passwort bestätigen"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(value) => updateField('confirmPassword', value)}
                        required
                        placeholder="Passwort wiederholen"
                    />

                    <div className="text-xs text-gray-500 mt-2">
                        Das Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten.
                    </div>
                </FormSection>

                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Registrierung wird abgeschlossen...' : 'Einladung annehmen'}
                    </button>
                </div>
            </form>
        </div>
    );
}
