'use client';

import { useState } from 'react';
import { useInvitation } from '../hooks/useInvitation';
import { FormField, Alert, Button, FormSection } from '@/components/SimpleFormComponents';
import type { InviteUserData } from '@/features/invitations/types/invitation';

interface InviteUserFormProps {
    organizationName: string;
}

export default function InviteUserForm({ organizationName }: InviteUserFormProps) {
    const { loading, error, success, sendInvitation, clearMessages } = useInvitation();
    
    const [formData, setFormData] = useState<InviteUserData>({
        email: '',
        firstname: '',
        lastname: '',
        role: 'Helfer',
        message: '',
        organizationName: organizationName
    });

    const updateField = (field: keyof InviteUserData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        clearMessages();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            await sendInvitation(formData);
            
            // Form nur bei erfolgreichem Versand zurücksetzen
            setFormData({
                email: '',
                firstname: '',
                lastname: '',
                role: 'Helfer',
                message: '',
                organizationName: organizationName
            });

            console.log('Invitation sent successfully');
        } catch (err) {
            // Fehler wird bereits vom Hook behandelt und im error state gesetzt
            // Form wird NICHT zurückgesetzt, damit Benutzer die Daten korrigieren kann
            console.error('Failed to send invitation:', err);
        }
    };

    const handleReset = () => {
        setFormData({
            email: '',
            firstname: '',
            lastname: '',
            role: 'Helfer',
            message: '',
            organizationName: organizationName
        });
        clearMessages();
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Helfer einladen</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Laden Sie neue Helfer zu Ihrer Organisation &ldquo;{organizationName}&rdquo; ein
                </p>
            </div>
            
            {error && (
                <Alert type="error" message={error} onClose={clearMessages} />
            )}
            
            {success && (
                <Alert type="success" message={success} onClose={clearMessages} />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <FormSection title="Persönliche Informationen">
                    <FormField
                        label="E-Mail-Adresse"
                        type="email"
                        value={formData.email}
                        onChange={(value) => updateField('email', value)}
                        required
                        placeholder="helfer@example.com"
                    />

                    <FormField
                        label="Vorname"
                        type="text"
                        value={formData.firstname}
                        onChange={(value) => updateField('firstname', value)}
                        required
                        placeholder="Max"
                    />

                    <FormField
                        label="Nachname"
                        type="text"
                        value={formData.lastname}
                        onChange={(value) => updateField('lastname', value)}
                        required
                        placeholder="Mustermann"
                    />

                    <div className="mb-4">
                        <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">
                            Rolle <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="role-select"
                            value={formData.role}
                            onChange={(e) => updateField('role', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="Helfer">Helfer</option>
                            <option value="Einsatzverwaltung">Einsatzverwaltung</option>
                            <option value="Organisationsverwaltung">Organisationsverwaltung</option>
                        </select>
                    </div>
                </FormSection>

                <FormSection title="Einladungsnachricht (optional)">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Persönliche Nachricht
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => updateField('message', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Hallo! Wir laden Sie ein, unserem Team beizutreten..."
                        />
                    </div>
                </FormSection>

                <div className="flex justify-between pt-6">
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={loading}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                    >
                        Zurücksetzen
                    </button>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Einladung wird versendet...' : 'Einladung versenden'}
                    </button>
                </div>
            </form>
        </div>
    );
}
