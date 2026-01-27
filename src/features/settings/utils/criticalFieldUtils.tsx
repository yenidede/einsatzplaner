import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const criticalFieldClass = (isEditable: boolean) =>
  cn(
    isEditable
      ? ''
      : 'disabled:opacity-50 disabled:cursor-not-allowed'
  );

export const criticalFieldLabel = (
  label: string,
  isEditable: boolean,
  required = false,
  htmlFor?: string
) => (
  <Label htmlFor={htmlFor} className="text-sm font-medium">
    {label}
    {required && <span className="text-destructive ml-1">*</span>}
    {!isEditable && (
      <span className="ml-2 text-xs font-normal text-muted-foreground">
        (Nur Superadmin)
      </span>
    )}
  </Label>
);
