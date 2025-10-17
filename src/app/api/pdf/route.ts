export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { PdfService } from '@/features/pdf/lib/services/pdfService';
import { validatePdfBuffer } from '@/features/pdf/lib/utils/validation';
import { validatePdfAccess } from '@/features/pdf/lib/utils/authorization';
import { generateBookingConfirmationHtml } from '@/features/pdf/lib/template/bookingConfirmation';
import { getEinsatzWithDetailsById } from '@/features/einsatz/dal-einsatz';

export async function POST(request: NextRequest) {
  const pdfService = new PdfService();

  try {
    const { einsatzId, options } = await request.json();

    if (!einsatzId) {
      return NextResponse.json({ error: 'einsatzId is required' }, { status: 400 });
    }
    const authResult = await validatePdfAccess(einsatzId);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const einsatz = await getEinsatzWithDetailsById(einsatzId);
    if (!einsatz) {
      return NextResponse.json({ error: 'Einsatz not found' }, { status: 404 });
    }

    const html = generateBookingConfirmationHtml({ einsatz, options });
    
    await pdfService.initialize();
    const pdfBuffer = await pdfService.generatePdfFromHtml(html);

    if (!validatePdfBuffer(pdfBuffer)) {
      return NextResponse.json({ error: 'PDF Generation Failed' }, { status: 500 });
    }

    // ✅ Return PDF
    const filename = `Buchungsbestaetigung_${new Date(einsatz.start).toISOString().split('T')[0]}_${einsatz.id}.pdf`;
    
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
  } finally {
    await pdfService.close();
  }
}