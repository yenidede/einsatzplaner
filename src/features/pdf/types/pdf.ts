export interface GeneratePdfRequest {
  url: string;
}

export interface GeneratePdfError {
  error: string;
  message?: string;
}

export interface PdfOptions {
  format?: 'A4' | 'A3' | 'Letter';
  landscape?: boolean;
}

export interface PdfGenerationRequest {
  type: 'booking-confirmation';
  einsatzId: string;
}