import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EinsatzService } from "@/features/einsatz-old/services/EinsatzService";
import { EinsatzFormData } from "@/features/einsatz-old/types/einsatz";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      einsatzId,
      formData,
    }: { einsatzId?: string; formData: Partial<EinsatzFormData> } = body;

    await EinsatzService.saveAutosave(einsatzId, formData);

    return NextResponse.json({
      message: "Autosave erfolgreich gespeichert",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error saving autosave:", error);
    return NextResponse.json(
      { error: "Fehler beim Speichern der Autosave-Daten" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const einsatzId = searchParams.get("einsatzId") || undefined;

    const autosaveData = await EinsatzService.getAutosave(einsatzId);

    return NextResponse.json(autosaveData);
  } catch (error) {
    console.error("Error fetching autosave:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden der Autosave-Daten" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const einsatzId = searchParams.get("einsatzId") || undefined;

    await EinsatzService.clearAutosave(einsatzId);

    return NextResponse.json({
      message: "Autosave-Daten erfolgreich gelöscht",
    });
  } catch (error) {
    console.error("Error clearing autosave:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen der Autosave-Daten" },
      { status: 500 }
    );
  }
}
