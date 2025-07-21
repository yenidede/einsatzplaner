import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import prisma from "@/lib/prisma";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;

  if (!file || !userId) {
    return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    // Always use userId as filename and extension from uploaded file
    const extension = file.name.split('.').pop() || 'jpg';
    const filePath = `users/${userId}/${userId}.${extension}`;

    const { data, error } = await supabase.storage
      .from("logos")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("logos")
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    console.log("Supabase upload data", data, "error", error);
    console.log("userId:", userId, "publicUrl:", publicUrl);
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { picture_url: publicUrl }, 
      });
      return NextResponse.json({ url: publicUrl });
    } catch (prismaError) {
      console.error("Prisma update error:", prismaError);
      return NextResponse.json({ error: prismaError instanceof Error ? prismaError.message : String(prismaError) }, { status: 500 });
    }
  } catch (error) {
    console.error("Upload/DB Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
