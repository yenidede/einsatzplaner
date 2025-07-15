// Form Field Component (Interface Segregation Principle)
export interface FormFieldProps {
    label: string;
    type: 'text' | 'email' | 'password' | 'tel' | 'url';
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: string;
    required?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    autoComplete?: string;
}

export function FormField({
    label,
    type,
    value,
    onChange,
    onBlur,
    error,
    required = false,
    placeholder,
    disabled = false,
    className = '',
    autoComplete
}: FormFieldProps) {
    const baseInputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200`;
    const errorClasses = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300';
    const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';

    return (
        <div className={`mb-4 ${className}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete={autoComplete}
                className={`${baseInputClasses} ${errorClasses} ${disabledClasses}`}
                required={required}
            />
            {error && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                </p>
            )}
        </div>
    );
}

// Alert Component (Single Responsibility Principle)
export interface AlertProps {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    onClose?: () => void;
    className?: string;
}

export function Alert({ type, message, onClose, className = '' }: AlertProps) {
    const baseClasses = 'mb-4 p-3 rounded-md border flex items-center justify-between';
    const typeClasses = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700'
    };

    const icons = {
        success: (
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
        ),
        error: (
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
        ),
        warning: (
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
        ),
        info: (
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
        )
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
            <div className="flex items-center">
                {icons[type]}
                <span>{message}</span>
            </div>
            {onClose && (
                <button
                    onClick={onClose}
                    className="ml-2 text-current hover:text-opacity-75 transition-opacity"
                    aria-label="Benachrichtigung schließen"
                    title="Schließen"
                >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            )}
        </div>
    );
}

// Button Component (Single Responsibility Principle)
export interface ButtonProps {
    children: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
    className?: string;
}

export function Button({
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    className = ''
}: ButtonProps) {
    const baseClasses = 'font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';
    
    const variantClasses = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
        outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {children}
        </button>
    );
}

// Form Section Component (Composition Pattern)
export interface FormSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function FormSection({ title, children, className = '' }: FormSectionProps) {
    return (
        <div className={`border-t pt-6 ${className}`}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
            {children}
        </div>
    );
}
