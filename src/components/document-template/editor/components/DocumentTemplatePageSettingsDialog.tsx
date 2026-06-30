import { PanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';

export function DocumentTemplatePageSettingsDialog({ controller }: { controller: DocumentTemplateEditorControllerModel }) {
  const { content, updatePageSettings } = controller;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PanelTop data-icon="inline-start" />
          Seiteneinstellungen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-160">
        <DialogHeader>
          <DialogTitle>Seiteneinstellungen</DialogTitle>
          <DialogDescription>
            Papierformat, Seitenränder und feste Bereiche der Vorlage.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Papierformat</Label>
              <Input value="A4" disabled />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Ausrichtung</Label>
              <Input value="Hochformat" disabled />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Oben</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={content.page.margins.top}
                onChange={(event) =>
                  updatePageSettings((page) => ({
                    ...page,
                    margins: {
                      ...page.margins,
                      top: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rechts</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={content.page.margins.right}
                onChange={(event) =>
                  updatePageSettings((page) => ({
                    ...page,
                    margins: {
                      ...page.margins,
                      right: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unten</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={content.page.margins.bottom}
                onChange={(event) =>
                  updatePageSettings((page) => ({
                    ...page,
                    margins: {
                      ...page.margins,
                      bottom: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Links</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={content.page.margins.left}
                onChange={(event) =>
                  updatePageSettings((page) => ({
                    ...page,
                    margins: {
                      ...page.margins,
                      left: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Kopfbereich anzeigen</Label>
                <Switch
                  checked={content.page.header.enabled}
                  onCheckedChange={(checked) =>
                    updatePageSettings((page) => ({
                      ...page,
                      header: { ...page.header, enabled: checked },
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Header-Höhe</Label>
                <Input
                  type="number"
                  min={12}
                  max={80}
                  value={content.page.header.height}
                  onChange={(event) =>
                    updatePageSettings((page) => ({
                      ...page,
                      header: {
                        ...page.header,
                        height: Number(event.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label>Fußbereich anzeigen</Label>
                <Switch
                  checked={content.page.footer.enabled}
                  onCheckedChange={(checked) =>
                    updatePageSettings((page) => ({
                      ...page,
                      footer: { ...page.footer, enabled: checked },
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Footer-Höhe</Label>
                <Input
                  type="number"
                  min={12}
                  max={80}
                  value={content.page.footer.height}
                  onChange={(event) =>
                    updatePageSettings((page) => ({
                      ...page,
                      footer: {
                        ...page.footer,
                        height: Number(event.target.value),
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
