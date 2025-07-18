import { useState, useCallback } from 'react';
import { UserService, UserUpdateData, ApiResponse, UserProfile } from '../../auth/services/UserService';
import { UserFormValidator } from '../../auth/validators/UserValidator';

// Hook Options Interface
export interface UseUserSettingsOptions {
    initialData: UserUpdateData;
    userService: UserService;
    validator: UserFormValidator;
}

// Hook Return Interface
export interface UseUserSettingsReturn {
    formData: UserUpdateData & { confirmPassword?: string };
    loading: boolean;
    error: string;
    message: string;
    fieldErrors: Record<string, string>;
    updateField: (field: string, value: string) => void;
    submitForm: (userId: string) => Promise<void>;
    validateField: (field: string) => string | undefined;
    resetForm: () => void;
}

// Custom Hook Implementation
export function useUserSettings({
    initialData,
    userService,
    validator
}: UseUserSettingsOptions): UseUserSettingsReturn {
    const [formData, setFormData] = useState<UserUpdateData & { confirmPassword?: string }>({
        ...initialData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Update single field
    const updateField = useCallback((field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        // Clear errors when user starts typing
        setError('');
        setMessage('');
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }, []);

    // Validate single field
    const validateField = useCallback((field: string): string | undefined => {
        const validation = validator.validateUserUpdate(formData);
        return validation.errors[field];
    }, [formData, validator]);

    // Submit form
    const submitForm = useCallback(async (userId: string) => {
        setLoading(true);
        setError('');
        setMessage('');

        try {
            console.log('Submitting form with data:', { userId, formData });

            // Validate entire form
            const validation = validator.validateUserUpdate(formData);
            
            if (!validation.isValid) {
                setFieldErrors(validation.errors);
                setError('Bitte korrigieren Sie die Fehler im Formular');
                return;
            }

            // Prepare data for API
            const updateData: UserUpdateData = {
                email: formData.email,
                firstname: formData.firstname,
                lastname: formData.lastname
            };

            // Add password fields if provided
            if (formData.newPassword && formData.currentPassword) {
                updateData.currentPassword = formData.currentPassword;
                updateData.newPassword = formData.newPassword;
            }

            console.log('Calling userService.updateProfile with:', { userId, updateData });

            // Call service
            const response: ApiResponse<UserProfile> = await userService.updateProfile(userId, updateData);
            if (!response.success) {
                throw new Error(response.error || 'Unbekannter Fehler beim Aktualisieren des Profils');
            }
            
            console.log('Service response:', response);

            if (!response.success) {
                throw new Error(response.error || 'Unbekannter Fehler');
            }

            setMessage(response.message || 'Profil erfolgreich aktualisiert');
            setFieldErrors({});
            
            // Clear password fields after successful update
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));

        } catch (err) {
            console.error('Form submission error:', err);
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    }, [formData, userService, validator]);

    // Reset form to initial state
    const resetForm = useCallback(() => {
        setFormData({
            ...initialData,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        setError('');
        setMessage('');
        setFieldErrors({});
    }, [initialData]);

    return {
        formData,
        loading,
        error,
        message,
        fieldErrors,
        updateField,
        submitForm,
        validateField,
        resetForm
    };
}

// Hook Factory for easier instantiation
export class UserSettingsHookFactory {
    static create(
        initialData: UserUpdateData,
        userService: UserService,
        validator: UserFormValidator
    ) {
        return () => useUserSettings({
            initialData,
            userService,
            validator
        });
    }
}
