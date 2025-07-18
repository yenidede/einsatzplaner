'use client';

import { useState } from 'react';
import { FormField, Alert, Button } from '@/components/SimpleFormComponents';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setEmail('');
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
                        Passwort zurücksetzen
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Geben Sie Ihre E-Mail-Adresse ein, um ein neues Passwort zu erhalten
                    </p>
                </div>

                {error && <Alert type="error" message={error} onClose={() => setError('')} />}
                {message && <Alert type="success" message={message} onClose={() => setMessage('')} />}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <FormField
                        label="E-Mail-Adresse"
                        type="email"
                        value={email}
                        onChange={setEmail}
                        required
                        placeholder="ihre@email.com"
                    />

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Sende...' : 'Passwort zurücksetzen'}
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
