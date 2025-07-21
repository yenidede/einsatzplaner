import {
  Einsatz,
  EinsatzFormData,
  EinsatzFilter,
  AutosaveData,
} from "@/features/einsatz-old/types/einsatz";
import { EinsatzModel } from "@/lib/mongo/models/Einsatz";

export class EinsatzService {
  static async createEinsatz(
    einsatzData: EinsatzFormData,
    userId: string
  ): Promise<Einsatz> {
    const validation = EinsatzModel.validateEinsatz(einsatzData);
    if (validation.length > 0) {
      throw new Error(`Validierung fehlgeschlagen: ${validation.join(", ")}`);
    }

    const einsatz = await EinsatzModel.create({
      ...einsatzData,
      createdBy: userId,
    });

    return einsatz;
  }

  static async updateEinsatz(
    id: string,
    updateData: Partial<EinsatzFormData>
  ): Promise<boolean> {
    const validation = EinsatzModel.validateEinsatz(updateData);
    if (validation.length > 0) {
      throw new Error(`Validierung fehlgeschlagen: ${validation.join(", ")}`);
    }

    return await EinsatzModel.update(id, updateData);
  }

  static async getEinsatz(id: string): Promise<Einsatz | null> {
    const result = await EinsatzModel.findById(id);
    if (!result) return null;
    // Map MongoDB document to Einsatz type
    const einsatz: Einsatz = {
      _id: result._id.toString(),
      name: result.name,
      kategorie: result.kategorie,
      datum: result.datum,
      uhrzeitVon: result.uhrzeitVon,
      uhrzeitBis: result.uhrzeitBis,
      anzahlTeilnehmer: result.anzahlTeilnehmer,
      einzelpreis: result.einzelpreis,
      anzahlHelfer: result.anzahlHelfer,
      createdBy: result.createdBy,
      // Add other properties as needed from the Einsatz type
      ...(result as any),
    };
    return einsatz;
  }

  static async getEinsaetze(
    filter?: EinsatzFilter,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    einsaetze: Einsatz[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [rawEinsaetze, total] = await Promise.all([
      EinsatzModel.findAll(filter, limit, skip),
      EinsatzModel.count(filter),
    ]);

    const einsaetze: Einsatz[] = rawEinsaetze.map((result: any) => ({
      _id: result._id.toString(),
      name: result.name,
      kategorie: result.kategorie,
      datum: result.datum,
      uhrzeitVon: result.uhrzeitVon,
      uhrzeitBis: result.uhrzeitBis,
      anzahlTeilnehmer: result.anzahlTeilnehmer,
      einzelpreis: result.einzelpreis,
      anzahlHelfer: result.anzahlHelfer,
      createdBy: result.createdBy,
      // Add other properties as needed from the Einsatz type
      ...(result as any),
    }));

    return {
      einsaetze,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async deleteEinsatz(id: string): Promise<boolean> {
    return await EinsatzModel.delete(id);
  }

  // Autosave-Funktionalität
  static async saveAutosave(
    einsatzId: string | undefined,
    formData: Partial<EinsatzFormData>
  ): Promise<void> {
    const autosaveData: AutosaveData = {
      einsatzId,
      formData,
      lastSaved: new Date(),
      isDirty: true,
    };

    // Speichere in localStorage (client-side) oder temporäre Collection (server-side)
    if (typeof window !== "undefined") {
      const key = `autosave_${einsatzId || "new"}`;
      localStorage.setItem(key, JSON.stringify(autosaveData));
    } else {
      // Server-side: Speichere in temporärer Collection
      // Implementierung für temporäre Speicherung
    }
  }

  static async getAutosave(
    einsatzId: string | undefined
  ): Promise<AutosaveData | null> {
    if (typeof window !== "undefined") {
      const key = `autosave_${einsatzId || "new"}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  static async clearAutosave(einsatzId: string | undefined): Promise<void> {
    if (typeof window !== "undefined") {
      const key = `autosave_${einsatzId || "new"}`;
      localStorage.removeItem(key);
    }
  }

  // Geschäftslogik für Warnungen
  static checkHelferWarning(
    anzahlHelfer: number,
    minimumHelfer: number = 2
  ): boolean {
    return anzahlHelfer < minimumHelfer;
  }

  static validateTimeRange(uhrzeitVon: string, uhrzeitBis: string): boolean {
    const [vonHour, vonMin] = uhrzeitVon.split(":").map(Number);
    const [bisHour, bisMin] = uhrzeitBis.split(":").map(Number);

    const vonMinutes = vonHour * 60 + vonMin;
    const bisMinutes = bisHour * 60 + bisMin;

    return bisMinutes > vonMinutes;
  }

  static calculateDuration(uhrzeitVon: string, uhrzeitBis: string): number {
    const [vonHour, vonMin] = uhrzeitVon.split(":").map(Number);
    const [bisHour, bisMin] = uhrzeitBis.split(":").map(Number);

    const vonMinutes = vonHour * 60 + vonMin;
    const bisMinutes = bisHour * 60 + bisMin;

    return bisMinutes - vonMinutes;
  }

  static calculateTotalPrice(
    anzahlTeilnehmer: number,
    einzelpreis: number
  ): number {
    return anzahlTeilnehmer * einzelpreis;
  }

  // Filter-Hilfsfunktionen
  static buildDateFilter(
    dateFrom?: string,
    dateTo?: string
  ): { from?: Date; to?: Date } | undefined {
    if (!dateFrom && !dateTo) return undefined;

    const filter: { from?: Date; to?: Date } = {};

    if (dateFrom) {
      filter.from = new Date(dateFrom);
    }

    if (dateTo) {
      filter.to = new Date(dateTo);
    }

    return filter;
  }

  // Validierungsregeln
  static getValidationRules() {
    return {
      name: {
        required: true,
        minLength: 2,
        maxLength: 200,
      },
      kategorie: {
        required: true,
        options: ["Freizeit (KiJu)", "Rüstzeuge (KiJu)", "Sonstiges"], // Aus Screenshot
      },
      datum: {
        required: true,
        minDate: new Date(),
      },
      uhrzeitVon: {
        required: true,
        pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      uhrzeitBis: {
        required: true,
        pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      },
      anzahlTeilnehmer: {
        required: true,
        min: 1,
        max: 999,
      },
      einzelpreis: {
        required: true,
        min: 0,
        max: 9999.99,
      },
      anzahlHelfer: {
        required: true,
        min: 1,
        max: 50,
      },
    };
  }
}
