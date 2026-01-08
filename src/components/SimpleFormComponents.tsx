import { cn } from '@/lib/utils';
import { useId } from 'react';

interface FormFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
}

export function FormField({
  label,
  type,
  value,
  onChange,
  required = false,
  autoComplete,
  placeholder,
  className,
  id,
  name,
}: FormFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputName = name || label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return (
    <div className={cn('mb-4', className)}>
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={inputId}
        name={inputName}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete || undefined}
        placeholder={placeholder}
        aria-label={label}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
}

export function Alert({
  type,
  message,
  onClose,
}: {
  type: 'error' | 'success';
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-4 rounded border p-3 ${
        type === 'error'
          ? 'border-red-400 bg-red-100 text-red-700'
          : 'border-green-400 bg-green-100 text-green-700'
      }`}
    >
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="text-sm font-bold">
          ×
        </button>
      </div>
    </div>
  );
}

export function Button({
  children,
  type = 'button',
  onClick,
  disabled = false,
  className = '',
}: any) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded px-4 py-2 focus:ring-2 focus:ring-offset-2 focus:outline-none ${className}`}
    >
      {children}
    </button>
  );
}

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h3 className="mb-4 text-lg font-medium">{title}</h3>
      {children}
    </div>
  );
}
