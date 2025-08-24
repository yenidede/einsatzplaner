import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("logo") as File | null;
    const orgId = formData.get("orgId") as string | null;

    if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });
    if (!orgId) return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Nur Bilder erlaubt" }, { status: 400 });

    const ext = (file.name.split(".").pop() || "png").replace(/[^a-z0-9]/gi, "");
    const filename = `logo-${orgId}-${Date.now()}.${ext}`;
    const filePath = `organizations/${orgId}/${filename}`;

    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      throw uploadError;
    }

    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    // Persistiere URL in DB
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { logo_url: publicUrl },
      select: { id: true, logo_url: true },
    });

    return NextResponse.json({ url: publicUrl, organization: updated });
  } catch (err) {
    console.error("Upload logo error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}