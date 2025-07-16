// Domain Types
export interface UserUpdateData {
    email: string;
    firstname: string;
    lastname: string;
    currentPassword?: string;
    newPassword?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    role: string;
}

// Generic API Response Interface
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// HTTP Client Abstraction (Dependency Inversion Principle)
export interface HttpClient {
    get<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>>;
    post<T>(url: string, data: any, options?: RequestInit): Promise<ApiResponse<T>>;
    put<T>(url: string, data: any, options?: RequestInit): Promise<ApiResponse<T>>;
    delete<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>>;
}

// Concrete HTTP Client Implementation
export class FetchHttpClient implements HttpClient {
    private baseUrl: string;

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    async get<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(url, { ...options, method: 'GET' });
    }

    async post<T>(url: string, data: any, options?: RequestInit): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        });
    }

    async put<T>(url: string, data: any, options?: RequestInit): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers
            }
        });
    }

    async delete<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
        return this.makeRequest<T>(url, { ...options, method: 'DELETE' });
    }

    private async makeRequest<T>(url: string, options: RequestInit): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${url}`, options);
            
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP Error: ${response.status} ${response.statusText}` };
                }
                return { 
                    success: false, 
                    error: errorData.error || `HTTP Error: ${response.status}` 
                };
            }

            let data;
            try {
                data = await response.json();
            } catch {
                // Falls die Antwort leer ist oder kein JSON
                data = {};
            }

            return { 
                success: true, 
                data: data,
                message: data.message 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Netzwerkfehler' 
            };
        }
    }
}

// Repository Interface (Interface Segregation Principle)
export interface UserRepository {
    updateProfile(userId: string, data: UserUpdateData): Promise<ApiResponse<UserProfile>>;
    getProfile(userId: string): Promise<ApiResponse<UserProfile>>;
    deleteProfile(userId: string): Promise<ApiResponse<void>>;
}

// Service Interface (Single Responsibility Principle)
export interface UserServiceInterface {
    updateProfile(userId: string, data: UserUpdateData): Promise<ApiResponse<UserProfile>>;
    getProfile(userId: string): Promise<ApiResponse<UserProfile>>;
    deleteProfile(userId: string): Promise<ApiResponse<void>>;
}

// Concrete User Service Implementation
export class UserService implements UserServiceInterface {
    private httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    async updateProfile(userId: string, data: UserUpdateData): Promise<ApiResponse<UserProfile>> {
        return this.httpClient.post<UserProfile>('/api/auth/settings', { userId, ...data });
    }

    async getProfile(userId: string): Promise<ApiResponse<UserProfile>> {
        return this.httpClient.get<UserProfile>(`/api/auth/profile/${userId}`);
    }

    async deleteProfile(userId: string): Promise<ApiResponse<void>> {
        return this.httpClient.delete<void>(`/api/auth/profile/${userId}`);
    }
}

// Factory Pattern for Service Creation
export class UserServiceFactory {
    static create(httpClient?: HttpClient): UserService {
        const client = httpClient || new FetchHttpClient();
        return new UserService(client);
    }
}

// Default export for backward compatibility
export default UserService;