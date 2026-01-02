"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import {
  getOrganizationAddressesAction,
  createOrganizationAddressAction,
  updateOrganizationAddressAction,
  deleteOrganizationAddressAction,
} from "../../organization-action";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrganizationAddressesProps {
  organizationId: string;
}

interface AddressFormData {
  label?: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
}

export function OrganizationAddresses({
  organizationId,
}: OrganizationAddressesProps) {
  const queryClient = useQueryClient();
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddressFormData>({
    label: "",
    street: "",
    postal_code: "",
    city: "",
    country: "Österreich",
  });

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["org-addresses", organizationId],
    queryFn: () => getOrganizationAddressesAction(organizationId),
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: createOrganizationAddressAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-addresses", organizationId],
      });
      toast.success("Adresse erfolgreich hinzugefügt!");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Hinzufügen der Adresse");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateOrganizationAddressAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-addresses", organizationId],
      });
      toast.success("Adresse erfolgreich aktualisiert!");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Aktualisieren der Adresse");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      deleteOrganizationAddressAction(id, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-addresses", organizationId],
      });
      toast.success("Adresse erfolgreich gelöscht!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Löschen der Adresse");
    },
  });

  const resetForm = () => {
    setFormData({
      label: "",
      street: "",
      postal_code: "",
      city: "",
      country: "Österreich",
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
      toast.error("Bitte alle Pflichtfelder ausfüllen");
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

  const handleEdit = (address: any) => {
    setFormData({
      label: address.label || "",
      street: address.street,
      postal_code: address.postal_code.toString(),
      city: address.city,
      country: address.country,
    });
    setEditingId(address.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    const result = await showDialog({
      title: "Adresse löschen",
      description: "Möchten Sie diese Adresse wirklich löschen?",
      confirmText: "Löschen",
      cancelText: "Abbrechen",
      variant: "destructive",
    });

    if (result === "success") {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <>
      {AlertDialogComponent}
      <div className="self-stretch flex flex-col justify-center items-start">
        <div className="self-stretch px-4 py-2 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-700" />
            <div className="text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
              Adressen
            </div>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 bg-slate-900 text-white rounded-md flex items-center gap-2 hover:bg-slate-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Hinzufügen</span>
          </button>
        </div>

        <div className="self-stretch px-4 py-2 flex flex-col gap-3">
          {isAdding && (
            <form
              onSubmit={handleSubmit}
              className="p-4 bg-slate-50 rounded-md border border-slate-200 flex flex-col gap-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
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
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
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
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
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
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700 transition-colors text-sm disabled:opacity-50"
                >
                  {editingId ? "Aktualisieren" : "Hinzufügen"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors text-sm"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="text-sm text-slate-500">Lädt Adressen...</div>
          ) : addresses.length === 0 ? (
            <div className="text-sm text-slate-500 italic">
              Keine Adressen vorhanden
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {addresses.map((address: any) => (
                <div
                  key={address.id}
                  className="p-3 bg-white border border-slate-200 rounded-md flex justify-between items-start hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    {address.label && (
                      <div className="text-sm font-semibold text-slate-800">
                        {address.label}
                      </div>
                    )}
                    <div className="text-sm text-slate-700">
                      {address.street}
                    </div>
                    <div className="text-sm text-slate-600">
                      {address.postal_code.toString()} {address.city},{" "}
                      {address.country}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleEdit(address)}
                          className="p-1.5 text-slate-600  hover:bg-slate-100 rounded transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adresse bearbeiten</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleDelete(address.id)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4  text-red-600" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adresse löschen</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
