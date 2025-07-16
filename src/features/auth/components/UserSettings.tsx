/* import { ObjectId } from 'mongodb'; */

'use client';

import { FormField, Alert, Button, FormSection } from './ui/FormComponents';
import { useUserSettings } from '../hooks/useUserSettings';
import { UserService, UserServiceFactory, FetchHttpClient } from '../services/UserService';
import { UserFormValidator } from '../validators/UserValidator';

interface UserSettingsProps {
    userId:  string;
    initialData: {

        email: string;
        firstname: string;
        lastname: string;
    };
    userService?: UserService;
    validator?: UserFormValidator;
}

export default function UserSettings({
    userId,
    initialData,
    userService,
    validator
}: UserSettingsProps) {
    console.log('UserSettings received userId:', userId);
    console.log('UserSettings received initialData:', initialData);
    
    // Use dependency injection with fallback to factory
    const service = userService || UserServiceFactory.create();
    const formValidator = validator || new UserFormValidator();

    const {
        formData,
        loading,
        error,
        message,
        fieldErrors,
        updateField,
        submitForm,
        validateField,
        resetForm
    } = useUserSettings({
        initialData,
        userService: service,
        validator: formValidator
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitForm(userId.toString());
    };

    const handleReset = () => {
        resetForm();
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Persönliche Accountverwaltung</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Verwalten Sie Ihre persönlichen Daten und Sicherheitseinstellungen
                </p>
            </div>
            
            {error && (
                <Alert 
                    type="error" 
                    message={error} 
                    onClose={() => updateField('error', '')}
                />
            )}
            
            {message && (
                <Alert 
                    type="success" 
                    message={message} 
                    onClose={() => updateField('message', '')}
                />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <FormField
                        label="E-Mail-Adresse"
                        type="email"
                        value={formData.email}
                        onChange={(value) => updateField('email', value)}
                        onBlur={() => validateField('email')}
                        error={fieldErrors.email}
                        required
                        autoComplete="email"
                    />

                    <FormField
                        label="Vorname"
                        type="text"
                        value={formData.firstname}
                        onChange={(value) => updateField('firstname', value)}
                        onBlur={() => validateField('firstname')}
                        error={fieldErrors.firstname}
                        required
                        autoComplete="given-name"
                    />

                    <FormField
                        label="Nachname"
                        type="text"
                        value={formData.lastname}
                        onChange={(value) => updateField('lastname', value)}
                        onBlur={() => validateField('lastname')}
                        error={fieldErrors.lastname}
                        required
                        autoComplete="family-name"
                    />
                </div>

                <FormSection title="Passwort ändern">
                    <FormField
                        label="Aktuelles Passwort"
                        type="password"
                        value={formData.currentPassword || ''}
                        onChange={(value) => updateField('currentPassword', value)}
                        error={fieldErrors.currentPassword}
                        autoComplete="current-password"
                        placeholder="Nur ausfüllen wenn Sie das Passwort ändern möchten"
                    />

                    <FormField
                        label="Neues Passwort"
                        type="password"
                        value={formData.newPassword || ''}
                        onChange={(value) => updateField('newPassword', value)}
                        onBlur={() => validateField('newPassword')}
                        error={fieldErrors.newPassword}
                        autoComplete="new-password"
                        placeholder="Mindestens 8 Zeichen mit Groß-, Kleinbuchstaben und Zahlen"
                    />

                    <FormField
                        label="Neues Passwort bestätigen"
                        type="password"
                        value={formData.confirmPassword || ''}
                        onChange={(value) => updateField('confirmPassword', value)}
                        onBlur={() => validateField('confirmPassword')}
                        error={fieldErrors.confirmPassword}
                        autoComplete="new-password"
                        placeholder="Passwort wiederholen"
                    />
                </FormSection>

                <div className="flex justify-between pt-6">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        disabled={loading}
                    >
                        Zurücksetzen
                    </Button>
                    
                    <Button
                        type="submit"
                        variant="primary"
                        loading={loading}
                        disabled={loading}
                    >
                        Änderungen speichern
                    </Button>
                </div>
            </form>
        </div>
    );
}