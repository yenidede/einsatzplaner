import { useEffect, useState } from 'react';
import { ImageIcon, RotateCcw, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type TemplateImageMode = 'inline' | 'free';
export type TemplateImageAlign = 'left' | 'center' | 'right';

export type TemplateImageProperties = {
  alt: string;
  width: number;
  height: number;
  align: TemplateImageAlign;
  keepAspectRatio: boolean;
  mode: TemplateImageMode;
  x: number;
  y: number;
};

type DocumentTemplateImagePropertiesPopoverProps = {
  values: TemplateImageProperties;
  onApply: (attrs: TemplateImageProperties) => void;
  onCancel: () => void;
  onReplace: () => void;
  onDelete: () => void;
};

const alignmentOptions: TemplateImageAlign[] = ['left', 'center', 'right'];

function normalizeNumber(value: number, fallback: number, min: number) {
  return Number.isFinite(value) ? Math.max(min, Math.round(value)) : fallback;
}

export function DocumentTemplateImagePropertiesPopover({
  values,
  onApply,
  onCancel,
  onReplace,
  onDelete,
}: DocumentTemplateImagePropertiesPopoverProps) {
  const [draft, setDraft] = useState<TemplateImageProperties>(values);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setDraft(values);
  }, [values]);

  const updateDraft = (attrs: Partial<TemplateImageProperties>) => {
    setDraft((current) => ({ ...current, ...attrs }));
  };

  const applyDraft = () => {
    onApply({
      ...draft,
      width: normalizeNumber(draft.width, values.width, 24),
      height: normalizeNumber(draft.height, values.height, 16),
      x: normalizeNumber(draft.x, values.x, 0),
      y: normalizeNumber(draft.y, values.y, 0),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Bild bearbeiten</p>
        <Button type="button" size="sm" variant="outline" onClick={onReplace}>
          <ImageIcon data-icon="inline-start" />
          Ersetzen
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Allgemein</p>
        <div className="flex flex-col gap-1.5">
          <Label>Alternativtext</Label>
          <Input
            value={draft.alt}
            onChange={(event) => updateDraft({ alt: event.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Positionierung
        </p>
        <div className="flex flex-col gap-1.5">
          <Label>Modus</Label>
          <Select
            value={draft.mode}
            onValueChange={(value) => {
              if (value !== 'inline' && value !== 'free') return;
              updateDraft({ mode: value });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inline">Im Textfluss</SelectItem>
              <SelectItem value="free">Frei positioniert</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {draft.mode === 'inline' ? (
          <div className="grid grid-cols-3 gap-2">
            {alignmentOptions.map((align) => (
              <Button
                key={align}
                type="button"
                size="sm"
                variant={draft.align === align ? 'secondary' : 'outline'}
                onClick={() => updateDraft({ align })}
              >
                {align === 'left'
                  ? 'Links'
                  : align === 'center'
                    ? 'Mitte'
                    : 'Rechts'}
              </Button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>X</Label>
              <Input
                type="number"
                min={0}
                value={draft.x}
                onChange={(event) =>
                  updateDraft({ x: Number(event.target.value) })
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Y</Label>
              <Input
                type="number"
                min={0}
                value={draft.y}
                onChange={(event) =>
                  updateDraft({ y: Number(event.target.value) })
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground">Größe</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <Label>Breite</Label>
            <Input
              type="number"
              min={24}
              max={640}
              value={draft.width}
              onChange={(event) =>
                updateDraft({ width: Number(event.target.value) })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Höhe</Label>
            <Input
              type="number"
              min={16}
              max={480}
              value={draft.height}
              onChange={(event) =>
                updateDraft({ height: Number(event.target.value) })
              }
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label>Seitenverhältnis beibehalten</Label>
          <Switch
            checked={draft.keepAspectRatio}
            onCheckedChange={(checked) =>
              updateDraft({ keepAspectRatio: checked })
            }
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-2">
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Bild löschen"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 data-icon="inline-start" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bild löschen</TooltipContent>
            </Tooltip>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Bild löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Das ausgewählte Bild wird aus der Vorlage entfernt. Diese
                  Aktion kann nicht rückgängig gemacht werden.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    onDelete();
                  }}
                >
                  Löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDraft(values)}
          >
            <RotateCcw data-icon="inline-start" />
            Zurücksetzen
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="button" size="sm" onClick={applyDraft}>
            Übernehmen
          </Button>
        </div>
      </div>
    </div>
  );
}
