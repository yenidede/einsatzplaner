'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import {
  createOrganizationAddressAction,
  getOrganizationAddressesAction,
  updateOrganizationAddressAction,
  deleteOrganizationAddressAction,
} from '@/features/settings/organization-action';
import { queryKeys as organizationQueryKeys } from '@/features/organization/queryKeys';
import { useOrganizationAddresses } from '@/features/organization/hooks/use-organization-queries';
import TooltipCustom from '@/components/tooltip-custom';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { Button } from '@/components/ui/button';

interface OrganizationAddressesProps {
  organizationId: string;
  isSuperadmin?: boolean;
}

interface AddressFormData {
  label?: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
}

type OrganizationAddress = Awaited<
  ReturnType<typeof getOrganizationAddressesAction>
>[number];

/**
 * Manages an organization's addresses.
 */
export function OrganizationAddresses({
  organizationId,
  isSuperadmin = false,
}: OrganizationAddressesProps) {
  const queryClient = useQueryClient();
  const { showDestructive } = useConfirmDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    label: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'Österreich',
  });

  const { data: addresses = [], isLoading } =
    useOrganizationAddresses(organizationId);

  const createMutation = useMutation({
    mutationFn: createOrganizationAddressAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.addresses(organizationId),
      });
      toast.success('Adresse erfolgreich hinzugefügt!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Hinzufügen der Adresse');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateOrganizationAddressAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.addresses(organizationId),
      });
      toast.success('Adresse erfolgreich aktualisiert!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Aktualisieren der Adresse');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      deleteOrganizationAddressAction(id, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.addresses(organizationId),
      });
      toast.success('Adresse erfolgreich gelöscht!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Löschen der Adresse');
    },
  });

  const resetForm = () => {
    setFormData({
      label: '',
      street: '',
      postal_code: '',
      city: '',
      country: 'Österreich',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.street ||
      !formData.postal_code ||
      !formData.city ||
      !formData.country
    ) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        orgId: organizationId,
        ...formData,
      });
    } else {
      createMutation.mutate({
        orgId: organizationId,
        ...formData,
      });
    }
  };

  const handleEdit = (address: OrganizationAddress) => {
    setFormData({
      label: address.label || '',
      street: address.street,
      postal_code: address.postal_code.toString(),
      city: address.city,
      country: address.country,
    });
    setEditingId(address.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!isSuperadmin) {
      toast.error('Nur Superadmins können Adressen löschen');
      return;
    }

    const result = await showDestructive(
      'Adresse löschen',
      'Möchten Sie diese Adresse wirklich löschen?',
      {
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
      }
    );

    if (result === 'success') {
      deleteMutation.mutate({ id });
    }
  };

  const handleAddClick = () => {
    if (!isSuperadmin) {
      toast.error('Nur Superadmins können Adressen hinzufügen');
      return;
    }
    setIsAdding(!isAdding);
  };

  return (
    <>
      <div className="flex flex-col items-start justify-center self-stretch">
        <div className="flex items-center justify-between self-stretch border-b border-slate-200 py-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-700" />
            <div className="font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
              Adressen
            </div>
          </div>
          <TooltipCustom
            text={
              !isSuperadmin ? 'Nur Superadmins können Adressen hinzufügen' : ''
            }
          >
            <Button
              onClick={handleAddClick}
              disabled={!isSuperadmin}
              size="sm"
              variant={isSuperadmin ? 'default' : 'secondary'}
            >
              <Plus className="h-4 w-4" />
              <span>Hinzufügen</span>
            </Button>
          </TooltipCustom>
        </div>

        <div className="flex flex-col gap-3 self-stretch py-2">
          {isAdding && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Label (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    placeholder="z.B. Hauptsitz, Filiale 1"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Straße & Hausnummer *
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) =>
                      setFormData({ ...formData, street: e.target.value })
                    }
                    placeholder="Musterstraße 123"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    PLZ *
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) =>
                      setFormData({ ...formData, postal_code: e.target.value })
                    }
                    placeholder="1010"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Stadt *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Wien"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Land *
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    placeholder="Österreich"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  size="sm"
                >
                  {editingId ? 'Aktualisieren' : 'Hinzufügen'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                  size="sm"
                >
                  Abbrechen
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-sm text-slate-500">Lädt Adressen...</div>
          ) : addresses.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Noch keine Adressen hinzugefügt
            </div>
          ) : (
            addresses.map((address: OrganizationAddress) => (
              <div
                key={address.id}
                className="flex items-start justify-between rounded-md border border-slate-200 bg-white p-4"
              >
                <div className="flex-1">
                  {address.label && (
                    <div className="mb-1 text-sm font-medium text-slate-900">
                      {address.label}
                    </div>
                  )}
                  <div className="text-sm text-slate-700">{address.street}</div>
                  <div className="text-sm text-slate-700">
                    {address.postal_code} {address.city}
                  </div>
                  <div className="text-sm text-slate-700">
                    {address.country}
                  </div>
                </div>

                <div className="flex gap-2">
                  <TooltipCustom
                    text={
                      !isSuperadmin
                        ? 'Nur Superadmins können Adressen bearbeiten'
                        : ''
                    }
                  >
                    <Button
                      onClick={() => handleEdit(address)}
                      disabled={!isSuperadmin}
                      variant="ghost"
                      size="icon"
                      aria-label="Adresse bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipCustom>

                  <TooltipCustom
                    text={
                      !isSuperadmin
                        ? 'Nur Superadmins können Adressen löschen'
                        : ''
                    }
                  >
                    <Button
                      onClick={() => handleDelete(address.id)}
                      disabled={!isSuperadmin || deleteMutation.isPending}
                      variant="ghost"
                      size="icon"
                      aria-label="Adresse löschen"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipCustom>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
