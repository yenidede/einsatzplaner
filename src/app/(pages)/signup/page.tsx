'use client';

import { useState } from 'react';
import { FormField, Alert, Button } from '@/components/SimpleFormComponents';

export default function SignUpPage() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstname: '',
        lastname: '',
        phone: '',
        organizationName: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwörter stimmen nicht überein');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
                setFormData({
                    email: '',
                    password: '',
                    confirmPassword: '',
                    firstname: '',
                    lastname: '',
                    phone: '',
                    organizationName: ''
                });
            } else {
                setError(data.error || 'Ein Fehler ist aufgetreten');
            }
        } catch (err) {
            setError('Netzwerkfehler. Bitte versuchen Sie es später erneut.');
        } finally {
            setLoading(false);
        }
    };

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Registrieren
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Oder{' '}
                        <a href="/signin" className="font-medium text-blue-600 hover:text-blue-500">
                            melden Sie sich an, wenn Sie bereits ein Konto haben
                        </a>
                    </p>
                </div>

                {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <FormField
                        label="E-Mail-Adresse"
                        type="email"
                        value={formData.email}
                        onChange={(value) => updateField('email', value)}
                        required
                        placeholder="ihre@email.com"
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

                    <FormField
                        label="Organisationsname"
                        type="text"
                        value={formData.organizationName}
                        onChange={(value) => updateField('organizationName', value)}
                        required
                        placeholder="Ihre Organisation"
                    />

                    <FormField
                        label="Telefonnummer"
                        type="text"
                        value={formData.phone}
                        onChange={(value) => updateField('phone', value)}
                        required
                        placeholder="Ihre Telefonnummer"
                    />

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

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Registrieren...' : 'Registrieren'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
