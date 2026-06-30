// Blocktypen
export type PdfBlockType =
  | 'text'
  | 'infoTable'
  | 'spacer'
  | 'signature'
  | 'presetNotice';

// Basis-Block
export interface PdfBlock {
  id: string;
  type: PdfBlockType;
  data: Record<string, any>; // Typisiert pro Block
}

// Spezifische Blöcke
export interface TextBlock extends PdfBlock {
  type: 'text';
  data: {
    content: string; // Mit Tokens wie {{assignment.formattedDate}}
  };
}

export interface InfoTableBlock extends PdfBlock {
  type: 'infoTable';
  data: {
    rows: Array<{ label: string; value: string }>; // Labels und Werte mit Tokens
  };
}

export interface SpacerBlock extends PdfBlock {
  type: 'spacer';
  data: {
    height: number; // In mm
  };
}

export interface SignatureBlock extends PdfBlock {
  type: 'signature';
  data: {
    text: string; // Mit Tokens
  };
}

export interface PresetNoticeBlock extends PdfBlock {
  type: 'presetNotice';
  data: {
    notice: string; // Fester Text, z.B. "Bitte pünktlich erscheinen"
  };
}

// Template-Struktur
export interface PdfTemplateContent extends Record<string, any> {
  blocks: PdfBlock[];
}

// Erlaubte Variablen (nur diese Tokens)
export type AllowedToken =
  | 'organization.name'
  | 'organization.email'
  | 'organization.phone'
  | 'organization.signatureName'
  | 'organization.signatureRole'
  | 'assignment.groupName'
  | 'assignment.programName'
  | 'assignment.formattedDate'
  | 'assignment.formattedTimeRange'
  | 'assignment.formattedDateTimeRange'
  | 'assignment.participantSummary'
  | 'assignment.priceSummary';

// ViewModel für Rendering
export interface PdfViewModel {
  organization: {
    name: string;
    email: string;
    phone: string;
    signatureName: string;
    signatureRole: string;
  };
  assignment: {
    groupName: string;
    programName: string;
    formattedDate: string; // z.B. "Donnerstag, 19. März 2026"
    formattedTimeRange: string; // z.B. "07:20 Uhr – 11:05 Uhr"
    formattedDateTimeRange: string; // Kombi
    participantSummary: string; // z.B. "0 Erwachsene / Senioren"
    priceSummary: string; // z.B. "€ 9/Person bzw. € 0 bei 0 Teilnehmer:innen"
  };
}
