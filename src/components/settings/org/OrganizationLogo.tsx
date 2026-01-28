'use client';

import { useRef } from 'react';
import { Upload, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

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

  return (
    <div className="flex items-center gap-6">
      {logoUrl ? (
        <Image src={logoUrl} alt={`Logo von ${name}`} width={80} height={80} />
      ) : (
        <Building2 className="h-20 w-20" />
      )}
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
