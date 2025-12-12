"use server";

import prisma from "@/lib/prisma";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";

interface EinsatzCategory {
  id: string;
  value: string | null;
  abbreviation: string | null;
}

export async function getEinsatzCategoriesForPDF(
  einsatzId: string
): Promise<EinsatzCategory[]> {
  try {
    const einsatz = await getEinsatzWithDetailsById(einsatzId);

    if (!einsatz || einsatz instanceof Response) {
      return [];
    }

    if (!Array.isArray(einsatz.categories) || einsatz.categories.length === 0) {
      return [];
    }

    const categoriesFromDb = await prisma.einsatz_category.findMany({
      where: {
        id: { in: einsatz.categories },
      },
    });

    return categoriesFromDb.map((cat) => ({
      id: cat.id,
      value: cat.value,
      abbreviation: cat.abbreviation,
    }));
  } catch (error) {
    console.error("Error loading categories for PDF:", error);
    return [];
  }
}
