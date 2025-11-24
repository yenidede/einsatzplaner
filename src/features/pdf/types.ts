export interface GeneratePdfRequest {
  url: string;
}

export interface GeneratePdfError {
  error: string;
  message?: string;
}

export interface PdfOptions {
  format?: "A4" | "A3" | "Letter";
  landscape?: boolean;
}

export interface PdfGenerationRequest {
  type: "booking-confirmation";
  einsatzId: string;
}

export interface PDFEinsatzData {
  id: string;
  title: string;
  start: Date;
  end: Date;
  all_day: boolean;
  helpers_needed: number;
  participant_count: number | null;
  price_per_person: number | null;
  total_price: number | null;
  created_at: Date;
}

export interface PDFOrganizationData {
  name: string;
  logo_url: string | null;
  helper_name_singular: string | null;
  helper_name_plural: string | null;
  email: string | null;
  phone: string | null;
}

export interface PDFHelperData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  roleAbbreviation: string | null;
  joined_at: Date;
}

export interface PDFCategoryData {
  value: string;
  abbreviation: string;
}

export interface PDFStatusData {
  helper_text: string;
  helper_color: string;
}

export interface PDFGenerationData {
  einsatz: PDFEinsatzData;
  organization: PDFOrganizationData;
  helpers: PDFHelperData[];
  categories: PDFCategoryData[];
  status: PDFStatusData;
  generatedAt: Date;
}

export interface PDFActionResult {
  success: boolean;
  error?: string;
  data?: {
    pdf: string;
    filename: string;
    mimeType: string;
  };
}

export interface PDFPreviewResult {
  success: boolean;
  error?: string;
  data?: PDFGenerationData;
}

export interface MultiplePDFResult {
  success: boolean;
  error?: string;
  data?: {
    successful: number;
    failed: number;
    pdfs: Array<{
      pdf: string;
      filename: string;
      mimeType: string;
    }>;
  };
}
