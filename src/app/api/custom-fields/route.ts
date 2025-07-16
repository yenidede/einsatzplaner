import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { CustomFieldDefinitionModel } from '@/lib/mongo/models/CustomFieldDefinition';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customFields = await CustomFieldDefinitionModel.findAll(true);
    return NextResponse.json(customFields);
    
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Custom Fields' },
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
    const customField = await CustomFieldDefinitionModel.create(body);
    return NextResponse.json(customField, { status: 201 });
    
  } catch (error) {
    console.error('Error creating custom field:', error);
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Custom Fields' },
      { status: 400 }
    );
  }
}
