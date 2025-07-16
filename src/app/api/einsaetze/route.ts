import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { EinsatzService } from '@/features/einsatz/services/EinsatzService';
import { EinsatzFormData, EinsatzFilter } from '@/features/einsatz/types/einsatz';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    // Build filter object
    const filter: EinsatzFilter = {};
    
    if (searchParams.get('name')) {
      filter.name = searchParams.get('name') || '';
    }
    
    if (searchParams.get('kategorie')) {
      filter.kategorie = searchParams.get('kategorie') || '';
    }
    
    if (searchParams.get('status')) {
      filter.status = searchParams.get('status') as any;
    }
    
    if (searchParams.get('systemStatus')) {
      filter.systemStatus = searchParams.get('systemStatus') as any;
    }
    
    if (searchParams.get('dateFrom') || searchParams.get('dateTo')) {
      filter.datum = EinsatzService.buildDateFilter(
        searchParams.get('dateFrom') || undefined,
        searchParams.get('dateTo') || undefined
      );
    }

    const result = await EinsatzService.getEinsaetze(filter, page, limit);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error fetching einsaetze:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Einsätze' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const einsatzData: EinsatzFormData = body;

    const einsatz = await EinsatzService.createEinsatz(einsatzData, session.user.id);
    return NextResponse.json(einsatz, { status: 201 });
    
  } catch (error) {
    console.error('Error creating einsatz:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Fehler beim Erstellen des Einsatzes' },
      { status: 400 }
    );
  }
}
