// src/app/api/test-db/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo/client';

export async function GET() {
  try {
    const client = await clientPromise;
    if (!client) {
      throw new Error('MongoDB client is null');
    }
    await client.db().command({ ping: 1 });
    return NextResponse.json({ connected: true });
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
