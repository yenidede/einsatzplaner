export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { z } from 'zod';
import { validatePdfAccess } from '@/features/pdf/lib/utils/authorization';
import { validatePdfBuffer } from '@/features/pdf/lib/utils/validation';
import { BookingConfirmationPDF } from '@/features/pdf/components/BookingConfirmationPDF';
import { getEinsatzWithDetailsById } from '@/features/einsatz/dal-einsatz';
import { Document } from '@react-pdf/renderer';
import { Einsatz } from '@/features/einsatz/types';


const requestSchema = z.object({
  einsatzId: z.string().uuid('einsatzId must be a valid UUID'),
  type: z.literal('booking-confirmation'),
  options: z.object({
    showLogos: z.boolean().optional(),
    showContactInfo: z.boolean().optional(),
    includeTerms: z.boolean().optional(),
  }).optional(),
});


function generateFilename(einsatz: Einsatz): string {
      // Date in DD-MM-YY format
    const date = new Date(einsatz.start)
      .toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
      // show time with :
      const startTime = new Date(einsatz.start)
    .toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
  // find the last name of the user who created the einsatz

  return `Fuehrungsbestaetigung-${date}-${startTime}.pdf`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validation = requestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      );
    }

    const { einsatzId, options } = validation.data;

    const authResult = await validatePdfAccess(einsatzId);
    
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const einsatz = await getEinsatzWithDetailsById(einsatzId);
    
    if (!einsatz) {
      return NextResponse.json(
        { error: 'Einsatz not found' },
        { status: 404 }
      );
    }

    console.log(`Generating PDF for einsatz ${einsatzId}...`);
    const document = React.createElement(
      Document,
      null,
      React.createElement(BookingConfirmationPDF, { einsatz, options })
    );

    const pdfBuffer = await renderToBuffer(document);

    if (!validatePdfBuffer(pdfBuffer)) {
      throw new Error('Generated PDF is invalid or empty');
    }

    console.log(`PDF generated successfully (${pdfBuffer.length} bytes)`);

    const filename = generateFilename(einsatz);

    return new NextResponse(Uint8Array.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('PDF Generation Error:', error);

    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';

    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
