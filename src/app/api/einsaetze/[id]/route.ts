import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { EinsatzService } from "@/features/einsatz-old/services/EinsatzService";
import { EinsatzFormData } from "@/features/einsatz-old/types/einsatz";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const einsatz = await EinsatzService.getEinsatz(params.id);

    if (!einsatz) {
      return NextResponse.json(
        { error: "Einsatz nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json(einsatz);
  } catch (error) {
    console.error("Error fetching einsatz:", error);
    return NextResponse.json(
      { error: "Fehler beim Laden des Einsatzes" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updateData: Partial<EinsatzFormData> = body;

    const success = await EinsatzService.updateEinsatz(params.id, updateData);

    if (!success) {
      return NextResponse.json(
        { error: "Einsatz nicht gefunden oder Update fehlgeschlagen" },
        { status: 404 }
      );
    }

    const updatedEinsatz = await EinsatzService.getEinsatz(params.id);
    return NextResponse.json(updatedEinsatz);
  } catch (error) {
    console.error("Error updating einsatz:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Fehler beim Aktualisieren des Einsatzes",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await EinsatzService.deleteEinsatz(params.id);

    if (!success) {
      return NextResponse.json(
        { error: "Einsatz nicht gefunden" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Einsatz erfolgreich gelöscht" });
  } catch (error) {
    console.error("Error deleting einsatz:", error);
    return NextResponse.json(
      { error: "Fehler beim Löschen des Einsatzes" },
      { status: 500 }
    );
  }
}
