# User Settings System - SOLID Design Patterns

## Überblick

Dieses System implementiert eine saubere, erweiterbare Benutzereinstellungs-Funktionalität basierend auf **SOLID-Prinzipien** und bewährten **Design Patterns**.

## Architektur

### SOLID-Prinzipien Implementation

#### 1. Single Responsibility Principle (SRP)
- **UserService**: Nur für API-Kommunikation zuständig
- **UserFormValidator**: Nur für Validierung zuständig  
- **PasswordService**: Nur für Passwort-Operationen zuständig
- **ProfileValidationService**: Nur für Profil-Validierung zuständig

#### 2. Open/Closed Principle (OCP)
- **ValidationStrategy**: Neue Validierungsregeln können hinzugefügt werden ohne bestehenden Code zu ändern
- **HttpClient Interface**: Neue HTTP-Implementierungen möglich

#### 3. Liskov Substitution Principle (LSP)
- **ValidationStrategy**: Alle Strategien sind austauschbar
- **HttpClient**: Verschiedene HTTP-Clients können verwendet werden

#### 4. Interface Segregation Principle (ISP)
- **UserRepository**: Spezifische Methoden für User-Operationen
- **ValidationStrategy**: Kleine, fokussierte Interfaces

#### 5. Dependency Inversion Principle (DIP)
- **UserService**: Abhängig von HttpClient Abstraktion, nicht von konkreter Implementierung
- **UserSettings Component**: Verwendet injizierte Dependencies

## Design Patterns

### 1. Strategy Pattern
```typescript
// Verschiedene Validierungsstrategien
export class EmailValidationStrategy implements ValidationStrategy
export class PasswordValidationStrategy implements ValidationStrategy
export class RequiredFieldValidationStrategy implements ValidationStrategy
```

### 2. Factory Pattern
```typescript
// Service-Erstellung
export class UserServiceFactory {
    static create(httpClient?: HttpClient): UserService
}

// Abstract Factory
export abstract class AuthComponentFactory {
    abstract createUserService(): UserService;
    abstract createValidator(): UserFormValidator;
}
```

### 3. Repository Pattern
```typescript
// Datenbank-Abstraktion
export class UserDatabaseService {
    async findUserById(userId: string)
    async findUserByEmail(email: string, excludeUserId?: string)
    async updateUser(userId: string, updateData: any)
}
```

### 4. Data Transfer Object (DTO) Pattern
```typescript
interface UpdateProfileRequest {
    userId: string;
    email: string;
    firstname: string;
    lastname: string;
    currentPassword?: string;
    newPassword?: string;
}
```

### 5. Builder Pattern
```typescript
// Konfiguration
export class AuthConfigBuilder {
    setApiBaseUrl(url: string): AuthConfigBuilder
    setTimeout(timeout: number): AuthConfigBuilder
    build(): AuthConfig
}
```

### 6. Dependency Injection Pattern
```typescript
// Component mit injizierter Dependencies
export default function UserSettings({
    userService = AuthServiceFactory.getUserService(),
    validator = AuthServiceFactory.getValidator()
}: UserSettingsProps)
```

## Verwendung

### Basis-Verwendung
```typescript
import UserSettings from '@/features/auth/components/UserSettings';

// Standardverwendung mit Factory
<UserSettings 
    userId="123" 
    initialData={{
        email: "user@example.com",
        firstname: "John",
        lastname: "Doe"
    }}
/>
```

### Erweiterte Verwendung mit Dependency Injection
```typescript
import { UserService, FetchHttpClient } from '@/features/auth/services/UserService';
import { UserFormValidator } from '@/features/auth/validators/UserValidator';

// Custom Services
const customHttpClient = new FetchHttpClient('https://api.example.com');
const customUserService = new UserService(customHttpClient);
const customValidator = new UserFormValidator();

<UserSettings 
    userId="123" 
    initialData={{...}}
    userService={customUserService}
    validator={customValidator}
/>
```

### Testing
```typescript
// Test mit Mock-Services
import { TestAuthFactory } from '@/features/auth/factories/AuthServiceFactory';

const mockHttpClient = {
    put: jest.fn().mockResolvedValue({ success: true })
};

const testFactory = new TestAuthFactory(mockHttpClient);
const userService = testFactory.createUserService();
```

## Praktische Verwendung

### 1. **Einfache Verwendung in einer Seite**
```typescript
// src/app/settings/page.tsx
import UserSettings from '@/features/auth/components/UserSettings';

<UserSettings 
    userId="user-123" 
    initialData={{
        email: "user@example.com",
        firstname: "John",
        lastname: "Doe"
    }}
/>
```

### 2. **Als Modal/Dialog**
```typescript
// src/components/UserSettingsModal.tsx
const [isOpen, setIsOpen] = useState(false);

{isOpen && (
    <div className="modal">
        <UserSettings userId={userId} initialData={userData} />
    </div>
)}
```

### 3. **Mit Next.js Session**
```typescript
// src/app/settings/page.tsx
import { getServerSession } from 'next-auth';

export default async function SettingsPage() {
    const session = await getServerSession();
    
    return (
        <UserSettings 
            userId={session.user.id}
            initialData={{
                email: session.user.email,
                firstname: session.user.name?.split(' ')[0],
                lastname: session.user.name?.split(' ')[1]
            }}
        />
    );
}
```

### 4. **URL-Routen einrichten**
```typescript
// Mögliche Routen:
// /settings          - Grundeinstellungen
// /profile           - Profil bearbeiten
// /account           - Account-Verwaltung
// /admin/settings    - Admin-Einstellungen
```

### 5. **Navigation hinzufügen**
```typescript
// Im Dashboard oder Header
<Link href="/settings" className="nav-link">
    <SettingsIcon />
    Einstellungen
</Link>
```

## Erweiterbarkeit

### Neue Validierungsregeln hinzufügen
```typescript
export class CustomValidationStrategy implements ValidationStrategy {
    validate(value: any): ValidationResult {
        // Custom validation logic
        return { isValid: true };
    }
}

// In UserFormValidator
const validator = new UserFormValidator();
validator.addStrategy('customField', new CustomValidationStrategy());
```

### Neue HTTP-Client Implementation
```typescript
export class AxiosHttpClient implements HttpClient {
    async get<T>(url: string): Promise<ApiResponse<T>> {
        // Axios implementation
    }
    // ... other methods
}

// Usage
const axiosClient = new AxiosHttpClient();
const userService = new UserService(axiosClient);
```

## Vorteile

### ✅ Testbarkeit
- Alle Dependencies sind injizierbar
- Mock-Implementierungen möglich
- Isolierte Unit-Tests

### ✅ Wartbarkeit
- Klare Trennung der Verantwortlichkeiten
- Lose Kopplung zwischen Komponenten
- Einfache Erweiterung ohne Änderung bestehenden Codes

### ✅ Wiederverwendbarkeit
- UI-Komponenten sind generisch
- Services können in anderen Kontexten verwendet werden
- Validierungslogik ist modular

### ✅ Skalierbarkeit
- Neue Features können ohne Breaking Changes hinzugefügt werden
- Verschiedene Implementierungen für verschiedene Umgebungen
- Konfigurierbare Komponenten

## Dateistruktur

```
src/features/auth/
├── components/
│   ├── UserSettings.tsx                 # Haupt-Komponente
│   └── ui/
│       └── FormComponents.tsx           # Wiederverwendbare UI-Komponenten
├── hooks/
│   └── useUserSettings.ts              # Custom Hook für State Management
├── services/
│   └── UserService.ts                  # API-Service mit HttpClient
├── validators/
│   └── UserValidator.ts                # Validierungslogik mit Strategy Pattern
├── factories/
│   └── AuthServiceFactory.ts           # Factory Pattern für Dependency Injection
└── README.md                           # Diese Dokumentation
```

## API-Endpunkte

### PUT /api/auth/settings
Aktualisiert Benutzerprofil

**Request Body:**
```typescript
{
    userId: string;
    email: string;
    firstname: string;
    lastname: string;
    currentPassword?: string;
    newPassword?: string;
}
```

**Response:**
```typescript
{
    message: string;
    user: {
        id: string;
        email: string;
        firstname: string;
        lastname: string;
        role: string;
    };
}
```

## Fazit

Diese Implementierung folgt professionellen Software-Entwicklungsstandards und ist bereit für:
- **Production Use**: Robuste Fehlerbehandlung und Validierung
- **Team Development**: Klare Struktur und Dokumentation
- **Future Extensions**: Flexible Architektur für neue Anforderungen
- **Testing**: Vollständig testbare Komponenten
