'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Type, Hash, Link2, Plus } from 'lucide-react';
import { PageHeader } from '@/components/settings/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StandardFieldsList } from './StandardFieldsList';
import { FieldTypeSelector } from '@/features/user_properties/components/FieldTypeSelector';
import { PropertyConfiguration } from '@/features/user_properties/components/PropertyConfiguration';
import type { PropertyConfig } from '@/features/user_properties/types';
import { INITIAL_CONFIG } from '@/features/user_properties/types';
import { useTemplate, useTemplateIcons } from '../hooks/use-template-queries';
import { useTemplateMutations } from '../hooks/useTemplateMutations';
import { useOrganization } from '@/features/organization/hooks/use-organization-queries';

interface TemplateFormProps {
  /** Required for create; in edit mode derived from loaded template if omitted */
  orgId?: string;
  templateId?: string | null;
  /** Optional for edit – derived from template.org_id when template is loaded */
  backHref?: string;
}

export function TemplateForm({
  orgId: orgIdProp,
  templateId,
  backHref: backHrefProp,
}: TemplateFormProps) {
  const router = useRouter();
  const isEdit = !!templateId;
  const { createMutation, updateMutation, addTemplateFieldMutation, isSaving } =
    useTemplateMutations();

  const { data: template, isLoading: templateLoading } = useTemplate(
    isEdit ? templateId : null
  );
  const effectiveOrgId =
    isEdit && template ? (template.org_id ?? undefined) : orgIdProp;
  const { data: icons = [] } = useTemplateIcons();
  const { data: org } = useOrganization(effectiveOrgId);

  const [name, setName] = useState('');
  const [iconId, setIconId] = useState('');
  const [description, setDescription] = useState('');
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [customFieldStep, setCustomFieldStep] = useState<
    'typeSelection' | 'configuration'
  >('typeSelection');
  const [customFieldConfig, setCustomFieldConfig] =
    useState<PropertyConfig>(INITIAL_CONFIG);

  useEffect(() => {
    if (template) {
      setName(template.name ?? '');
      setIconId(template.icon_id);
      setDescription(template.description ?? '');
    }
  }, [template]);

  const handleSave = useCallback(() => {
    if (!iconId && icons.length > 0) setIconId(icons[0].id);
    if (isEdit && templateId) {
      updateMutation.mutate({
        templateId,
        name: name.trim() || null,
        icon_id: iconId || undefined,
        description: description.trim() || null,
      });
    } else if (effectiveOrgId) {
      createMutation.mutate({
        org_id: effectiveOrgId,
        name: name.trim() || '',
        icon_id: iconId || (icons[0]?.id ?? ''),
        description: description.trim() || null,
      });
    }
  }, [
    isEdit,
    templateId,
    effectiveOrgId,
    name,
    iconId,
    icons,
    createMutation,
    updateMutation,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  const computedBackHref =
    isEdit && template?.org_id
      ? `/settings/org/${template.org_id}#vorlagen`
      : (backHrefProp ?? '/settings');

  const handleCancel = useCallback(() => {
    router.push(computedBackHref);
  }, [router, computedBackHref]);

  const pageTitle = isEdit
    ? template
      ? `${(template.name ?? '').trim() || 'Vorlage'} bearbeiten`
      : 'Vorlage erstellen'
    : `Erstelle Vorlage ${name.trim() !== '' ? `'${name.trim()}'` : ''}`;

  const existingTemplateFieldNames =
    template?.template_field
      ?.map((tf) => tf.field?.name ?? '')
      .filter(Boolean)
      .map((n) => String(n).toLowerCase()) ?? [];

  const handleCustomFieldTypeSelect = (type: PropertyConfig['fieldType']) => {
    if (!type) return;
    setCustomFieldConfig((prev) => ({ ...prev, fieldType: type }));
    setCustomFieldStep('configuration');
  };

  const handleCustomFieldConfigChange = (updates: Partial<PropertyConfig>) => {
    setCustomFieldConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleCustomFieldSave = () => {
    if (!templateId || !customFieldConfig.fieldType) return;
    addTemplateFieldMutation.mutate(
      { templateId, config: customFieldConfig },
      {
        onSuccess: () => {
          setCustomFieldDialogOpen(false);
          setCustomFieldStep('typeSelection');
          setCustomFieldConfig(INITIAL_CONFIG);
        },
      }
    );
  };

  const handleCustomFieldDialogClose = (open: boolean) => {
    if (!open) {
      setCustomFieldDialogOpen(false);
      setCustomFieldStep('typeSelection');
      setCustomFieldConfig(INITIAL_CONFIG);
    }
  };

  const maxParticipantsPerHelper = org?.max_participants_per_helper ?? 20;

  const header = (
    <PageHeader
      title={pageTitle}
      onSave={handleSave}
      isSaving={isSaving}
      onCancel={handleCancel}
    />
  );

  const loadingContent = (
    <div className="text-muted-foreground py-8 text-center text-sm">
      Lade Vorlage…
    </div>
  );

  if (isEdit && templateLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {loadingContent}
      </div>
    );
  }

  if (isEdit && !templateLoading && !template) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-muted-foreground py-8 text-center text-sm">
          Vorlage nicht gefunden.
        </p>
      </div>
    );
  }

  const formContent = (
    <>
      <div className="grid gap-8">
        {/* Template info */}
        <Card>
          <CardHeader>
            <CardTitle>Template-Informationen</CardTitle>
            <CardDescription>Bezeichnung und Icon der Vorlage</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Bezeichnung <span className="text-destructive">*</span>
              </Label>
              <Input
                id="template-name"
                placeholder="Einsatzname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-icon">
                Template Icon <span className="text-destructive">*</span>
              </Label>
              <Select
                value={iconId || (icons[0]?.id ?? '')}
                onValueChange={setIconId}
              >
                <SelectTrigger id="template-icon">
                  <SelectValue placeholder="Icon auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {icons.map((icon, index) => (
                    <SelectItem key={icon.id} value={icon.id}>
                      <span className="flex items-center gap-2">
                        {icon.icon_url?.trim() ? (
                          <Image
                            src={icon.icon_url.trim()}
                            alt=""
                            width={18}
                            height={18}
                            unoptimized
                          />
                        ) : (
                          <span className="bg-muted h-[18px] w-[18px] rounded" />
                        )}
                        Icon {index + 1}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Standard fields */}
        <Card>
          <CardHeader>
            <CardTitle>Standardfelder</CardTitle>
            <CardDescription>
              Von uns vordefinierte Felder für jeden Einsatz. Diese können nicht
              bearbeitet werden. Können durch eigene Felder (siehe unten)
              ergänzt werden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StandardFieldsList />
          </CardContent>
        </Card>

        {/* Custom fields */}
        <Card>
          <CardHeader>
            <CardTitle>Eigene Felder</CardTitle>
            <CardDescription>
              Wähle einen Feldtyp aus. Eigene Felder ergänzen die von uns
              erstellten Standardfelder.
            </CardDescription>
            <CardAction>
              <Button
                variant="default"
                onClick={() => setCustomFieldDialogOpen(true)}
                disabled={!templateId}
              >
                <Plus className="mr-2 h-4 w-4" />
                {!!templateId
                  ? 'Eigenes Feld hinzufügen'
                  : 'Zuerst Vorlage speichern (⌘S)'}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {!template?.template_field?.length ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Image
                  src="https://fgxvzejucaxteqvnhojt.supabase.co/storage/v1/object/public/images/undraw_instant-analysis_vm8x%201.svg"
                  alt="Eigene Felder"
                  width={245}
                  height={210}
                  unoptimized
                />
                <Button
                  variant="outline"
                  className="w-full max-w-xs"
                  onClick={() => setCustomFieldDialogOpen(true)}
                  disabled={!templateId}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {!!templateId
                    ? 'Eigenes Feld hinzufügen'
                    : 'Zuerst Vorlage speichern (⌘S)'}
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {template.template_field.map((tf) => (
                  <li
                    key={tf.field.id}
                    className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2"
                  >
                    <Type className="text-muted-foreground h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">
                      {tf.field?.name ?? 'Feld'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({tf.field?.type?.datatype ?? '—'})
                    </span>
                    {tf.field?.is_required && (
                      <span className="text-muted-foreground ml-auto text-xs">
                        Pflichtfeld
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Custom field dialog: type selection + configuration (same flow as UserProperties) */}
        <Dialog
          open={customFieldDialogOpen}
          onOpenChange={handleCustomFieldDialogClose}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Feldtyp auswählen</DialogTitle>
            </DialogHeader>
            {customFieldStep === 'typeSelection' ? (
              <FieldTypeSelector
                onSelectType={handleCustomFieldTypeSelect}
                onBack={() => handleCustomFieldDialogClose(false)}
              />
            ) : (
              <PropertyConfiguration
                config={customFieldConfig}
                onConfigChange={handleCustomFieldConfigChange}
                onSave={handleCustomFieldSave}
                onCancel={() => setCustomFieldStep('typeSelection')}
                existingPropertyNames={existingTemplateFieldNames}
                existingUserCount={0}
                title="Feld konfigurieren"
                nameLabel="Label *"
                saveButtonLabel="Feld Speichern"
                saveDisabled={addTemplateFieldMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Verifications */}
        <Card>
          <CardHeader>
            <CardTitle>Überprüfungen</CardTitle>
            <CardDescription>
              Regeln für Teilnehmer und Personeneigenschaften
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2">
              <Hash className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-sm">
                Anzahl Teilnehmer:innen maximal{' '}
                <span className="text-primary font-semibold">
                  {maxParticipantsPerHelper}
                </span>{' '}
                <span className="text-muted-foreground">pro Helfer:in</span>
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                Feld
              </span>
            </div>
            <div className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2">
              <Link2 className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="text-sm">
                Person hat Schlüssel mindestens{' '}
                <span className="text-primary font-semibold">1</span>
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                Personeneigenschaft
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <footer className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-40 flex items-center justify-end gap-2 border-t py-4">
        <Button variant="ghost" onClick={handleCancel}>
          Schließen (ESC)
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Speichert…' : 'Speichern'}
        </Button>
      </footer>
    </>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="space-y-8">
        {header}
        {formContent}
      </div>
    </div>
  );
}
