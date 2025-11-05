export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { z } from 'zod';
import { Document, renderToBuffer } from '@react-pdf/renderer';
import { validatePdfAccess } from '@/features/pdf/lib/utils/authorization';
import { validatePdfBuffer } from '@/features/pdf/lib/utils/validation';
import { BookingConfirmationPDF } from '@/features/pdf/components/BookingConfirmationPDF';
import { getEinsatzWithDetailsById } from '@/features/einsatz/dal-einsatz';
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
        const { einsatzId, options } = await request.json();

        if (!einsatzId) {
            return NextResponse.json({ error: 'einsatzId is required' }, { status: 400 });
        }

        // ✅ Authorization
        const authResult = await validatePdfAccess(einsatzId);
        if (!authResult.authorized) {
            return NextResponse.json({ error: authResult.error }, { status: authResult.status });
        }

        // ✅ Fetch Data
        const einsatz = await getEinsatzWithDetailsById(einsatzId);
        if (!einsatz) {
            return NextResponse.json({ error: 'Einsatz not found' }, { status: 404 });
        }

        const documentElement = React.createElement(
            Document,
            null,
            React.createElement(BookingConfirmationPDF, { einsatz, options })
        );
        const pdfBuffer = await renderToBuffer(documentElement);
        console.log('PDF Buffer generated:', pdfBuffer);

        const filename = `Buchungsbestaetigung_${new Date(einsatz.start).toISOString().split('T')[0]}.pdf`;

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('PDF Error:', error);
        return NextResponse.json(
        { error: 'Internal Server Error', message: (error as Error).message },
        { status: 500 }
        );
    } 
}
