import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo/client';

export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const templates = await db.collection('einsatztemplates').find({}).toArray();
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const client = await clientPromise;
  const db = client.db();
  const result = await db.collection('einsatztemplates').insertOne({
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return NextResponse.json({ _id: result.insertedId, ...data });
}
