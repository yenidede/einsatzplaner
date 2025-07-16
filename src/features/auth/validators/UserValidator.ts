// Validation Result Interface
export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

// Strategy Pattern for Validation
export interface ValidationStrategy {
    validate(value: any, context?: any): ValidationResult;
}

// Concrete Validation Strategies
export class EmailValidationStrategy implements ValidationStrategy {
    validate(email: string): ValidationResult {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        return {
            isValid,
            message: isValid ? undefined : 'Ungültige E-Mail-Adresse'
        };
    }
}

export class PasswordValidationStrategy implements ValidationStrategy {
    private minLength: number;

    constructor(minLength: number = 8) {
        this.minLength = minLength;
    }

    validate(password: string): ValidationResult {
        const hasMinLength = password.length >= this.minLength;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        
        const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumbers;
        
        let message: string | undefined;
        if (!hasMinLength) {
            message = `Passwort muss mindestens ${this.minLength} Zeichen haben`;
        } else if (!hasUpperCase) {
            message = 'Passwort muss einen Großbuchstaben enthalten';
        } else if (!hasLowerCase) {
            message = 'Passwort muss einen Kleinbuchstaben enthalten';
        } else if (!hasNumbers) {
            message = 'Passwort muss mindestens eine Zahl enthalten';
        }
        
        return { isValid, message };
    }
}

export class RequiredFieldValidationStrategy implements ValidationStrategy {
    validate(value: string): ValidationResult {
        const isValid = Boolean(value && value.trim().length > 0);
        return {
            isValid,
            message: isValid ? undefined : 'Dieses Feld ist erforderlich'
        };
    }
}

export class PasswordMatchValidationStrategy implements ValidationStrategy {
    validate(password: string, confirmPassword: string): ValidationResult {
        const isValid = password === confirmPassword;
        return {
            isValid,
            message: isValid ? undefined : 'Passwörter stimmen nicht überein'
        };
    }
}

// Validator Context using Strategy Pattern
export class FieldValidator {
    private strategies: Map<string, ValidationStrategy[]> = new Map();

    constructor() {
        this.setupDefaultStrategies();
    }

    private setupDefaultStrategies(): void {
        this.strategies.set('email', [
            new RequiredFieldValidationStrategy(),
            new EmailValidationStrategy()
        ]);
        
        this.strategies.set('password', [
            new RequiredFieldValidationStrategy(),
            new PasswordValidationStrategy()
        ]);
        
        this.strategies.set('firstname', [
            new RequiredFieldValidationStrategy()
        ]);
        
        this.strategies.set('lastname', [
            new RequiredFieldValidationStrategy()
        ]);
    }

    addStrategy(fieldName: string, strategy: ValidationStrategy): void {
        const existingStrategies = this.strategies.get(fieldName) || [];
        existingStrategies.push(strategy);
        this.strategies.set(fieldName, existingStrategies);
    }

    validateField(fieldName: string, value: any, context?: any): ValidationResult {
        const fieldStrategies = this.strategies.get(fieldName) || [];
        
        for (const strategy of fieldStrategies) {
            const result = strategy.validate(value, context);
            if (!result.isValid) {
                return result;
            }
        }
        
        return { isValid: true };
    }

    validateForm(data: Record<string, any>): Record<string, string> {
        const errors: Record<string, string> = {};
        
        for (const [fieldName, value] of Object.entries(data)) {
            const result = this.validateField(fieldName, value);
            if (!result.isValid && result.message) {
                errors[fieldName] = result.message;
            }
        }
        
        return errors;
    }
}

// Composite Validator (Composite Pattern)
export class UserFormValidator {
    private fieldValidator: FieldValidator;

    constructor() {
        this.fieldValidator = new FieldValidator();
    }

    validateUserUpdate(data: {
        email: string;
        firstname: string;
        lastname: string;
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }): { isValid: boolean; errors: Record<string, string> } {
        const errors: Record<string, string> = {};

        // Validate basic fields
        const basicErrors = this.fieldValidator.validateForm({
            email: data.email,
            firstname: data.firstname,
            lastname: data.lastname
        });

        Object.assign(errors, basicErrors);

        // Validate password change if provided
        if (data.newPassword) {
            const passwordResult = this.fieldValidator.validateField('password', data.newPassword);
            if (!passwordResult.isValid && passwordResult.message) {
                errors.newPassword = passwordResult.message;
            }

            // Check if current password is provided
            if (!data.currentPassword) {
                errors.currentPassword = 'Aktuelles Passwort ist erforderlich';
            }

            // Check password match
            if (data.confirmPassword) {
                const matchValidator = new PasswordMatchValidationStrategy();
                const matchResult = matchValidator.validate(data.newPassword, data.confirmPassword);
                if (!matchResult.isValid && matchResult.message) {
                    errors.confirmPassword = matchResult.message;
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}
