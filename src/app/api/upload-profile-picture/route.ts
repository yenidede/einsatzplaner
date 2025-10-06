import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// ✅ Verwende Service Role Key (umgeht RLS komplett)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ Service Role statt ANON_KEY
);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  const userId = formData.get("userId") as string;
  
  console.log(session.user.id, " is uploading a profile picture.");
  
  if(session.user.id !== userId) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!file || !userId) {
    return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
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

    console.log("Supabase upload data", data, "publicUrl:", publicUrl);
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { picture_url: publicUrl }, 
    });
    
    return NextResponse.json({ url: publicUrl });
    
  } catch (error) {
    console.error("Upload/DB Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
