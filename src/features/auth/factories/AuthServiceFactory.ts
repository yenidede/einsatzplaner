import { UserService, FetchHttpClient } from '../services/UserService';
import { UserFormValidator } from '../validators/UserValidator';

// Factory Pattern für Service-Erstellung
export class AuthServiceFactory {
    private static userServiceInstance: UserService | null = null;
    private static validatorInstance: UserFormValidator | null = null;

    // Singleton Pattern für UserService
    static getUserService(): UserService {
        if (!this.userServiceInstance) {
            const httpClient = new FetchHttpClient();
            this.userServiceInstance = new UserService(httpClient);
        }
        return this.userServiceInstance;
    }

    // Singleton Pattern für Validator
    static getValidator(): UserFormValidator {
        if (!this.validatorInstance) {
            this.validatorInstance = new UserFormValidator();
        }
        return this.validatorInstance;
    }

    // Factory Method für Custom Konfiguration
    static createUserService(httpClient?: any): UserService {
        const client = httpClient || new FetchHttpClient();
        return new UserService(client);
    }

    // Factory Method für Test-Doubles
    static createTestUserService(mockHttpClient: any): UserService {
        return new UserService(mockHttpClient);
    }

    // Factory Method für Custom Validator
    static createValidator(): UserFormValidator {
        return new UserFormValidator();
    }

    // Reset für Tests
    static reset(): void {
        this.userServiceInstance = null;
        this.validatorInstance = null;
    }
}

// Abstract Factory Pattern für verschiedene Auth-Komponenten
export abstract class AuthComponentFactory {
    abstract createUserService(): UserService;
    abstract createValidator(): UserFormValidator;
}

// Concrete Factory für Production
export class ProductionAuthFactory extends AuthComponentFactory {
    createUserService(): UserService {
        return AuthServiceFactory.getUserService();
    }

    createValidator(): UserFormValidator {
        return AuthServiceFactory.getValidator();
    }
}

// Concrete Factory für Testing
export class TestAuthFactory extends AuthComponentFactory {
    constructor(
        private mockHttpClient: any,
        private mockValidator?: UserFormValidator
    ) {
        super();
    }

    createUserService(): UserService {
        return AuthServiceFactory.createTestUserService(this.mockHttpClient);
    }

    createValidator(): UserFormValidator {
        return this.mockValidator || AuthServiceFactory.createValidator();
    }
}

// Provider Pattern für Dependency Injection
export class AuthServiceProvider {
    private static factory: AuthComponentFactory = new ProductionAuthFactory();

    static setFactory(factory: AuthComponentFactory): void {
        this.factory = factory;
    }

    static getUserService(): UserService {
        return this.factory.createUserService();
    }

    static getValidator(): UserFormValidator {
        return this.factory.createValidator();
    }
}

// Configuration Object Pattern
export interface AuthConfig {
    apiBaseUrl?: string;
    timeout?: number;
    retryAttempts?: number;
    validationRules?: {
        passwordMinLength?: number;
        emailRegex?: RegExp;
    };
}

// Builder Pattern für komplexe Konfiguration
export class AuthConfigBuilder {
    private config: AuthConfig = {};

    setApiBaseUrl(url: string): AuthConfigBuilder {
        this.config.apiBaseUrl = url;
        return this;
    }

    setTimeout(timeout: number): AuthConfigBuilder {
        this.config.timeout = timeout;
        return this;
    }

    setRetryAttempts(attempts: number): AuthConfigBuilder {
        this.config.retryAttempts = attempts;
        return this;
    }

    setPasswordMinLength(length: number): AuthConfigBuilder {
        this.config.validationRules = this.config.validationRules || {};
        this.config.validationRules.passwordMinLength = length;
        return this;
    }

    build(): AuthConfig {
        return { ...this.config };
    }
}

// Default export für einfache Verwendung
export default AuthServiceFactory;
