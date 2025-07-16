import { NextRequest, NextResponse } from 'next/server';
import { CustomFieldDefinitionModel } from '@/lib/mongo/models/CustomFieldDefinition';
import { EinsatzModel } from '@/lib/mongo/models/Einsatz';

export async function POST(request: NextRequest) {
  try {
    // Initialize database indexes and default data
    await Promise.all([
      CustomFieldDefinitionModel.createIndexes(),
      EinsatzModel.createIndexes(),
      CustomFieldDefinitionModel.initializeDefaultFields()
    ]);

    return NextResponse.json({ 
      message: 'Database initialized successfully' 
    });
    
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Fehler beim Initialisieren der Datenbank' },
      { status: 500 }
    );
  }
}
