import { useState, useEffect, useCallback } from "react";
import {
  Einsatz,
  EinsatzFormData,
  EinsatzFilter,
  AutosaveData,
} from "@/features/einsatz-old/types/einsatz";

interface UseEinsatzResult {
  einsaetze: Einsatz[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
  createEinsatz: (data: EinsatzFormData) => Promise<Einsatz>;
  updateEinsatz: (
    id: string,
    data: Partial<EinsatzFormData>
  ) => Promise<Einsatz | null>;
  deleteEinsatz: (id: string) => Promise<boolean>;
  fetchEinsaetze: (filter?: EinsatzFilter, page?: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useEinsatz(): UseEinsatzResult {
  const [einsaetze, setEinsaetze] = useState<Einsatz[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [currentFilter, setCurrentFilter] = useState<
    EinsatzFilter | undefined
  >();

  const fetchEinsaetze = useCallback(
    async (filter?: EinsatzFilter, page: number = 1) => {
      setLoading(true);
      setError(null);
      setCurrentFilter(filter);

      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", "10");

        if (filter) {
          if (filter.name) params.append("name", filter.name);
          if (filter.kategorie) params.append("kategorie", filter.kategorie);
          if (filter.status) params.append("status", filter.status);
          if (filter.systemStatus)
            params.append("systemStatus", filter.systemStatus);
          if (filter.datum?.from)
            params.append("dateFrom", filter.datum.from.toISOString());
          if (filter.datum?.to)
            params.append("dateTo", filter.datum.to.toISOString());
        }

        const response = await fetch(`/api/einsaetze?${params}`);

        if (!response.ok) {
          throw new Error("Fehler beim Laden der Einsätze");
        }

        const result = await response.json();

        setEinsaetze(result.einsaetze);
        setPagination({
          page: result.page,
          totalPages: result.totalPages,
          total: result.total,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refetch = useCallback(async () => {
    await fetchEinsaetze(currentFilter, pagination.page);
  }, [fetchEinsaetze, currentFilter, pagination.page]);

  const createEinsatz = useCallback(
    async (data: EinsatzFormData): Promise<Einsatz> => {
      const response = await fetch("/api/einsaetze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fehler beim Erstellen des Einsatzes");
      }

      const newEinsatz = await response.json();

      // Refresh list
      await refetch();

      return newEinsatz;
    },
    [refetch]
  );

  const updateEinsatz = useCallback(
    async (
      id: string,
      data: Partial<EinsatzFormData>
    ): Promise<Einsatz | null> => {
      const response = await fetch(`/api/einsaetze/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Fehler beim Aktualisieren des Einsatzes"
        );
      }

      const updatedEinsatz = await response.json();

      // Update local state
      setEinsaetze((prev) =>
        prev.map((e) => (e._id === id ? updatedEinsatz : e))
      );

      return updatedEinsatz;
    },
    []
  );

  const deleteEinsatz = useCallback(async (id: string): Promise<boolean> => {
    const response = await fetch(`/api/einsaetze/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Fehler beim Löschen des Einsatzes");
    }

    // Remove from local state
    setEinsaetze((prev) => prev.filter((e) => e._id !== id));

    return true;
  }, []);

  // Initial load
  useEffect(() => {
    fetchEinsaetze();
  }, [fetchEinsaetze]);

  return {
    einsaetze,
    loading,
    error,
    pagination,
    createEinsatz,
    updateEinsatz,
    deleteEinsatz,
    fetchEinsaetze,
    refetch,
  };
}

interface UseAutosaveResult {
  saveAutosave: (
    einsatzId: string | undefined,
    formData: Partial<EinsatzFormData>
  ) => Promise<void>;
  getAutosave: (einsatzId: string | undefined) => Promise<AutosaveData | null>;
  clearAutosave: (einsatzId: string | undefined) => Promise<void>;
}

export function useAutosave(): UseAutosaveResult {
  const saveAutosave = useCallback(
    async (
      einsatzId: string | undefined,
      formData: Partial<EinsatzFormData>
    ) => {
      const response = await fetch("/api/einsaetze/autosave", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ einsatzId, formData }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Fehler beim Speichern der Autosave-Daten"
        );
      }
    },
    []
  );

  const getAutosave = useCallback(
    async (einsatzId: string | undefined): Promise<AutosaveData | null> => {
      const params = new URLSearchParams();
      if (einsatzId) params.append("einsatzId", einsatzId);

      const response = await fetch(`/api/einsaetze/autosave?${params}`);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    },
    []
  );

  const clearAutosave = useCallback(async (einsatzId: string | undefined) => {
    const params = new URLSearchParams();
    if (einsatzId) params.append("einsatzId", einsatzId);

    const response = await fetch(`/api/einsaetze/autosave?${params}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Fehler beim Löschen der Autosave-Daten");
    }
  }, []);

  return {
    saveAutosave,
    getAutosave,
    clearAutosave,
  };
}
