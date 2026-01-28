'use client';

import { useRef } from 'react';
import { Upload, Trash2, Building2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface OrganizationLogoSectionProps {
  name: string;
  logoUrl: string;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoRemove: () => void;
}

export function OrganizationLogoSection({
  name,
  logoUrl,
  onLogoUpload,
  onLogoRemove,
}: OrganizationLogoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = name
    ? name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 3)
    : 'ORG';

  return (
    <div className="flex items-center gap-6">
      <Avatar className="h-20 w-20">
        <AvatarImage src={logoUrl || undefined} alt={`Logo von ${name}`} />
        <AvatarFallback className="text-lg">
          {logoUrl ? <Building2 className="h-8 w-8" /> : initials}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={onLogoUpload}
            id="logo-upload"
            aria-label="Logo hochladen"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Logo hochladen
          </Button>
          {logoUrl && (
            <Button
              type="button"
              variant="outline"
              onClick={onLogoRemove}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Entfernen
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          JPG, PNG oder GIF. Maximal 1MB.
        </p>
      </div>
    </div>
  );
}
