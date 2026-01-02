"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Landmark } from "lucide-react";
import {
  getOrganizationBankAccountsAction,
  createOrganizationBankAccountAction,
  updateOrganizationBankAccountAction,
  deleteOrganizationBankAccountAction,
} from "../../organization-action";
import { useAlertDialog } from "@/hooks/use-alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrganizationBankAccountsProps {
  organizationId: string;
}

interface BankAccountFormData {
  bank_name: string;
  iban: string;
  bic: string;
}

export function OrganizationBankAccounts({
  organizationId,
}: OrganizationBankAccountsProps) {
  const queryClient = useQueryClient();
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankAccountFormData>({
    bank_name: "",
    iban: "",
    bic: "",
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["org-bank-accounts", organizationId],
    queryFn: () => getOrganizationBankAccountsAction(organizationId),
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: createOrganizationBankAccountAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-bank-accounts", organizationId],
      });
      toast.success("Bankkonto erfolgreich hinzugefügt!");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Hinzufügen des Bankkontos");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateOrganizationBankAccountAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-bank-accounts", organizationId],
      });
      toast.success("Bankkonto erfolgreich aktualisiert!");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Aktualisieren des Bankkontos");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      deleteOrganizationBankAccountAction(id, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-bank-accounts", organizationId],
      });
      toast.success("Bankkonto erfolgreich gelöscht!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Fehler beim Löschen des Bankkontos");
    },
  });

  const resetForm = () => {
    setFormData({
      bank_name: "",
      iban: "",
      bic: "",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bank_name || !formData.iban || !formData.bic) {
      toast.error("Bitte alle Felder ausfüllen");
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

  const handleEdit = (account: any) => {
    setFormData({
      bank_name: account.bank_name,
      iban: account.iban,
      bic: account.bic,
    });
    setEditingId(account.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    const result = await showDialog({
      title: "Bankkonto löschen",
      description: "Möchten Sie dieses Bankkonto wirklich löschen?",
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
            <Landmark className="w-4 h-4 text-slate-700" />
            <div className="text-slate-800 text-sm font-semibold font-['Inter'] leading-tight">
              Bankkonten
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
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Bankname *
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    placeholder="Erste Bank"
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    IBAN *
                  </label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        iban: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="AT12 3456 7890 1234 5678"
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    BIC *
                  </label>
                  <input
                    type="text"
                    value={formData.bic}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bic: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="GIBAATWWXXX"
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm font-mono"
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
            <div className="text-sm text-slate-500">Lädt Bankkonten...</div>
          ) : accounts.length === 0 ? (
            <div className="text-sm text-slate-500 italic">
              Keine Bankkonten vorhanden
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((account: any) => (
                <div
                  key={account.id}
                  className="p-3 bg-white border border-slate-200 rounded-md flex justify-between items-start hover:bg-slate-50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-slate-800">
                      {account.bank_name}
                    </div>
                    <div className="text-sm text-slate-700 font-mono">
                      IBAN: {account.iban}
                    </div>
                    <div className="text-sm text-slate-600 font-mono">
                      BIC: {account.bic}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-1.5 text-slate-600  hover:bg-slate-100  rounded transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Bankkonto bearbeiten</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4  text-red-600" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Bankkonto löschen</p>
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
