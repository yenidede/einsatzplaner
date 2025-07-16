interface FormFieldProps {
    label: string;
    type: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    autoComplete?: string;
    placeholder?: string;
}

export function FormField({ 
    label, 
    type, 
    value, 
    onChange, 
    required = false, 
    autoComplete, 
    placeholder 
}: FormFieldProps) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                autoComplete={autoComplete || undefined}
                placeholder={placeholder}
                aria-label={label}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    );
}

export function Alert({ type, message, onClose }: { type: 'error' | 'success', message: string, onClose: () => void }) {
    return (
        <div className={`mb-4 p-3 border rounded ${type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'}`}>
            <div className="flex justify-between items-center">
                <span>{message}</span>
                <button onClick={onClose} className="text-sm font-bold">×</button>
            </div>
        </div>
    );
}

export function Button({ children, type = 'button', onClick, disabled = false, className = '' }: any) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}
        >
            {children}
        </button>
    );
}

export function FormSection({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">{title}</h3>
            {children}
        </div>
    );
}
