'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import { queryKeys } from '@/features/einsatz/queryKeys';
import {
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
} from '@/features/category/category-action';

export interface CategoryItem {
  id: string;
  value: string;
  abbreviation: string;
}

interface OrganizationDefaultValuesProps {
  orgId: string;
  helperSingular: string;
  maxParticipantsPerHelper: string;
  defaultStarttime: string;
  defaultEndtime: string;
  categories: CategoryItem[];
  onMaxParticipantsPerHelperChange: (value: string) => void;
  onDefaultStarttimeChange: (value: string) => void;
  onDefaultEndtimeChange: (value: string) => void;
}

export function OrganizationDefaultValues({
  orgId,
  helperSingular,
  maxParticipantsPerHelper,
  defaultStarttime,
  defaultEndtime,
  categories,
  onMaxParticipantsPerHelperChange,
  onDefaultStarttimeChange,
  onDefaultEndtimeChange,
}: OrganizationDefaultValuesProps) {
  const queryClient = useQueryClient();
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [newAbbreviation, setNewAbbreviation] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editAbbreviation, setEditAbbreviation] = useState('');

  const createMutation = useMutation({
    mutationFn: (input: { value: string; abbreviation: string }) =>
      createCategoryAction(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories(orgId),
      });
      toast.success('Kategorie hinzugefügt');
      setNewValue('');
      setNewAbbreviation('');
      setIsAdding(false);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Fehler beim Hinzufügen der Kategorie');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      categoryId,
      value,
      abbreviation,
    }: {
      categoryId: string;
      value: string;
      abbreviation: string;
    }) =>
      updateCategoryAction(categoryId, orgId, {
        value,
        abbreviation,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories(orgId),
      });
      toast.success('Kategorie aktualisiert');
      setEditingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Fehler beim Aktualisieren der Kategorie');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) =>
      deleteCategoryAction(categoryId, orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.categories(orgId),
      });
      toast.success('Kategorie gelöscht');
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Fehler beim Löschen der Kategorie');
    },
  });

  const handleStartEdit = (cat: CategoryItem) => {
    setEditingId(cat.id);
    setEditValue(cat.value);
    setEditAbbreviation(cat.abbreviation ?? '');
  };

  const handleSaveEdit = () => {
    if (!editingId || !editValue.trim()) return;
    updateMutation.mutate({
      categoryId: editingId,
      value: editValue.trim(),
      abbreviation: editAbbreviation.trim(),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleAddCategory = () => {
    if (!newValue.trim()) {
      toast.error('Bitte einen Namen für die Kategorie angeben.');
      return;
    }
    createMutation.mutate({
      value: newValue.trim(),
      abbreviation: newAbbreviation.trim(),
    });
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    const result = await showDialog({
      title: 'Kategorie löschen',
      description: `Möchten Sie die Kategorie „${cat.value}" wirklich löschen?`,
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
    });
    if (result === 'success') {
      deleteMutation.mutate(cat.id);
    }
  };

  return (
    <>
      {AlertDialogComponent}
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="max-participants">
            Maximale Teilnehmende pro {helperSingular}
          </Label>
          <Input
            id="max-participants"
            type="number"
            value={maxParticipantsPerHelper}
            onChange={(e) => onMaxParticipantsPerHelperChange(e.target.value)}
            placeholder="z.B. 25"
            aria-label={`Maximale Teilnehmende pro ${helperSingular}`}
            min="0"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default-starttime">Standard-Startzeit</Label>
            <Input
              id="default-starttime"
              type="time"
              value={defaultStarttime}
              onChange={(e) => onDefaultStarttimeChange(e.target.value)}
              aria-label="Standard-Startzeit für neue Einsätze"
            />
            <p className="text-muted-foreground text-sm">
              Wird im Einsatz-Dialog als Vorgabe für die Startzeit verwendet.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-endtime">Standard-Endzeit</Label>
            <Input
              id="default-endtime"
              type="time"
              value={defaultEndtime}
              onChange={(e) => onDefaultEndtimeChange(e.target.value)}
              aria-label="Standard-Endzeit für neue Einsätze"
            />
            <p className="text-muted-foreground text-sm">
              Wird im Einsatz-Dialog als Vorgabe für die Endzeit verwendet.
            </p>
          </div>
        </div>

        {/* Kategorien */}
        <div className="space-y-3">
          <Label>Kategorien</Label>
          <p className="text-muted-foreground text-sm">
            Kategorien für Einsätze anlegen, bearbeiten und löschen.
          </p>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-wrap items-center gap-2 rounded-md border p-2"
              >
                {editingId === cat.id ? (
                  <>
                    <Input
                      className="max-w-[200px]"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Name"
                      aria-label="Kategorie Name"
                    />
                    <Input
                      className="max-w-[120px]"
                      value={editAbbreviation}
                      onChange={(e) => setEditAbbreviation(e.target.value)}
                      placeholder="Kürzel"
                      aria-label="Kategorie Kürzel"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={updateMutation.isPending || !editValue.trim()}
                    >
                      Speichern
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={updateMutation.isPending}
                    >
                      Abbrechen
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="font-medium">{cat.value}</span>
                    {cat.abbreviation ? (
                      <span className="text-muted-foreground text-sm">
                        ({cat.abbreviation})
                      </span>
                    ) : null}
                    <div className="ml-auto flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(cat)}
                        aria-label={`${cat.value} bearbeiten`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={deleteMutation.isPending}
                        aria-label={`${cat.value} löschen`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {isAdding ? (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2">
              <Input
                className="max-w-[200px]"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Name der Kategorie"
                aria-label="Neue Kategorie Name"
              />
              <Input
                className="max-w-[120px]"
                value={newAbbreviation}
                onChange={(e) => setNewAbbreviation(e.target.value)}
                placeholder="Kürzel (optional)"
                aria-label="Neue Kategorie Kürzel"
              />
              <Button
                size="sm"
                onClick={handleAddCategory}
                disabled={createMutation.isPending || !newValue.trim()}
              >
                Hinzufügen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewValue('');
                  setNewAbbreviation('');
                }}
                disabled={createMutation.isPending}
              >
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Kategorie hinzufügen
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
