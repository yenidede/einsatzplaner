"use client";

import { useQuery } from "@tanstack/react-query";
import { getEinsatzCategoriesForPDF } from "../category-action";

interface EinsatzCategory {
  id: string;
  value: string | null;
  abbreviation: string | null;
}

export function useEinsatzCategories(einsatzId: string | null) {
  return useQuery<EinsatzCategory[]>({
    queryKey: ["einsatz-categories", einsatzId],
    queryFn: () => {
      if (!einsatzId) {
        return Promise.resolve([]);
      }
      return getEinsatzCategoriesForPDF(einsatzId);
    },
    enabled: !!einsatzId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
