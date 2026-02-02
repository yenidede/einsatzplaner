'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Landmark } from 'lucide-react';
import {
  createOrganizationBankAccountAction,
  updateOrganizationBankAccountAction,
  deleteOrganizationBankAccountAction,
} from '@/features/settings/organization-action';
import { useOrganizationBankAccounts } from '@/features/organization/hooks/use-organization-queries';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface OrganizationBankAccountsProps {
  organizationId: string;
  isSuperadmin?: boolean;
}

interface BankAccountFormData {
  bank_name: string;
  iban: string;
  bic: string;
}

export function OrganizationBankAccounts({
  organizationId,
  isSuperadmin = false,
}: OrganizationBankAccountsProps) {
  const queryClient = useQueryClient();
  const { showDialog, AlertDialogComponent } = useAlertDialog();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BankAccountFormData>({
    bank_name: '',
    iban: '',
    bic: '',
  });

  const { data: accounts = [], isLoading } =
    useOrganizationBankAccounts(organizationId);

  const createMutation = useMutation({
    mutationFn: createOrganizationBankAccountAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['org-bank-accounts', organizationId],
      });
      toast.success('Bankkonto erfolgreich hinzugefügt!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Hinzufügen des Bankkontos');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateOrganizationBankAccountAction,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['org-bank-accounts', organizationId],
      });
      toast.success('Bankkonto erfolgreich aktualisiert!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Aktualisieren des Bankkontos');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      deleteOrganizationBankAccountAction(id, organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['org-bank-accounts', organizationId],
      });
      toast.success('Bankkonto erfolgreich gelöscht!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Fehler beim Löschen des Bankkontos');
    },
  });

  const resetForm = () => {
    setFormData({
      bank_name: '',
      iban: '',
      bic: '',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAddClick = () => {
    if (!isSuperadmin) {
      toast.error('Nur Superadmins können Bankkonten hinzufügen');
      return;
    }
    setIsAdding(!isAdding);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bank_name || !formData.iban || !formData.bic) {
      toast.error('Bitte alle Felder ausfüllen');
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
      title: 'Bankkonto löschen',
      description: 'Möchten Sie dieses Bankkonto wirklich löschen?',
      confirmText: 'Löschen',
      cancelText: 'Abbrechen',
      variant: 'destructive',
    });

    if (result === 'success') {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <>
      {AlertDialogComponent}
      <div className="flex flex-col items-start justify-center self-stretch">
        <div className="flex items-center justify-between self-stretch border-b border-slate-200 py-2">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-slate-700" />
            <div className="font-['Inter'] text-sm leading-tight font-semibold text-slate-800">
              Bankkonten
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleAddClick}
                disabled={!isSuperadmin}
                size="sm"
                variant={isSuperadmin ? 'default' : 'secondary'}
              >
                <Plus className="h-4 w-4" />
                <span>Hinzufügen</span>
              </Button>
            </TooltipTrigger>
            {!isSuperadmin && (
              <TooltipContent>
                Nur Superadmins können Bankkonten hinzufügen
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        <div className="flex flex-col gap-3 self-stretch py-2">
          {isAdding && (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-4"
            >
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="bank_name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Bankname *
                  </label>
                  <input
                    id="bank_name"
                    name="bank_name"
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    placeholder="Erste Bank"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="iban"
                    className="text-sm font-medium text-slate-700"
                  >
                    IBAN *
                  </label>
                  <input
                    type="text"
                    id="iban"
                    name="iban"
                    value={formData.iban}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        iban: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="AT12 3456 7890 1234 5678"
                    className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="bic"
                    className="text-sm font-medium text-slate-700"
                  >
                    BIC *
                  </label>
                  <input
                    type="text"
                    id="bic"
                    name="bic"
                    value={formData.bic}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bic: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="GIBAATWWXXX"
                    className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
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
                >
                  {editingId ? 'Aktualisieren' : 'Hinzufügen'}
                </Button>
                <Button variant="outline" type="button" onClick={resetForm}>
                  Abbrechen
                </Button>
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
                  className="flex items-start justify-between rounded-md border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-slate-800">
                      {account.bank_name}
                    </div>
                    <div className="font-mono text-sm text-slate-700">
                      IBAN: {account.iban}
                    </div>
                    <div className="font-mono text-sm text-slate-600">
                      BIC: {account.bic}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleEdit(account)}
                          disabled={!isSuperadmin}
                          variant="ghost"
                          size="icon"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {!isSuperadmin
                          ? 'Nur Superadmins können Bankkonten bearbeiten'
                          : 'Bankkonto bearbeiten'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleDelete(account.id)}
                          disabled={!isSuperadmin || deleteMutation.isPending}
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      {!isSuperadmin && (
                        <TooltipContent>
                          Nur Superadmins können Bankkonten löschen
                        </TooltipContent>
                      )}
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
