'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormField, Alert, Button } from '@/components/SimpleFormComponents';

interface ResetPasswordPageProps {
    token: string;
}

export default function ResetPasswordPage({ token }: ResetPasswordPageProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('Passwörter stimmen nicht überein');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Passwort erfolgreich zurückgesetzt! Sie werden zur Anmeldung weitergeleitet...');
                setTimeout(() => {
                    router.push('/signin');
                }, 3000);
            } else {
                setError(data.error || 'Ein Fehler ist aufgetreten');
            }
        } catch (err) {
            setError('Netzwerkfehler. Bitte versuchen Sie es später erneut.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Neues Passwort setzen
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Geben Sie Ihr neues Passwort ein
                    </p>
                </div>

                {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <FormField
                        label="Neues Passwort"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        required
                        placeholder="Mindestens 8 Zeichen"
                    />

                    <FormField
                        label="Passwort bestätigen"
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        required
                        placeholder="Passwort wiederholen"
                    />

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Speichern...' : 'Passwort speichern'}
                    </Button>
                </form>

                <div className="text-center">
                    <a href="/signin" className="text-blue-600 hover:text-blue-500">
                        ← Zurück zur Anmeldung
                    </a>
                </div>
            </div>
        </div>
    );
}
