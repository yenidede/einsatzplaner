'use server';

import prisma from '@/lib/prisma';
import { PdfTemplateContent } from '@/types/pdfTemplate';
import { revalidatePath } from 'next/cache';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];
// Erstelle Template
export async function createPdfTemplate(data: {
  organizationId: string;
  name: string;
  contentJson: PdfTemplateContent;
}) {
  const template = await prisma.pdfTemplate.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      contentJson: data.contentJson as JsonValue,
    },
  });
  revalidatePath('/settings/pdf-templates');
  return template;
}

// Update Template
export async function updatePdfTemplate(
  id: string,
  data: {
    name?: string;
    contentJson?: PdfTemplateContent;
    isActive?: boolean;
  }
) {
  const updateData: {
    name?: string;
    contentJson?: JsonValue;
    isActive?: boolean;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.contentJson !== undefined)
    updateData.contentJson = data.contentJson as JsonValue;

  const template = await prisma.pdfTemplate.update({
    where: { id },
    data: updateData,
  });
  revalidatePath('/settings/pdf-templates');
  return template;
}

// Lösche Template
export async function deletePdfTemplate(id: string) {
  await prisma.pdfTemplate.delete({
    where: { id },
  });
  revalidatePath('/settings/pdf-templates');
}

// Lade Templates für Organization
export async function getPdfTemplates(organizationId: string) {
  const templates = await prisma.pdfTemplate.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
  return templates;
}

// Dupliziere Template
export async function duplicatePdfTemplate(id: string) {
  const original = await prisma.pdfTemplate.findUnique({
    where: { id },
  });
  if (!original) throw new Error('Template not found');

  const duplicate = await prisma.pdfTemplate.create({
    data: {
      organizationId: original.organizationId,
      name: `${original.name} (Kopie)`,
      contentJson: original.contentJson as JsonValue,
    },
  });
  revalidatePath('/settings/pdf-templates');
  return duplicate;
}

// Preview Template (mit Mock-Daten)
export async function previewPdfTemplate(id: string) {
  const template = await prisma.pdfTemplate.findUnique({
    where: { id },
  });
  if (!template) throw new Error('Template not found');

  // Mock ViewModel für Preview
  const mockViewModel = {
    organization: {
      name: 'Beispiel Organisation',
      email: 'info@beispiel.de',
      phone: '0123 456789',
      signatureName: 'Max Mustermann',
      signatureRole: 'Leiter',
    },
    assignment: {
      groupName: 'Gruppe A',
      programName: 'Programm 1',
      formattedDate: 'Donnerstag, 19. März 2026',
      formattedTimeRange: '07:20 Uhr – 11:05 Uhr',
      formattedDateTimeRange:
        'Donnerstag, 19. März 2026, 07:20 Uhr – 11:05 Uhr',
      participantSummary: '0 Erwachsene / Senioren',
      priceSummary: '€ 9/Person bzw. € 0 bei 0 Teilnehmer:innen',
    },
  };

  return { template, mockViewModel };
}

// Generiere PDF für Assignment
export async function generatePdfForAssignment(
  assignmentId: string,
  templateId: string
) {
  // Lade Template
  const template = await prisma.pdfTemplate.findUnique({
    where: { id: templateId },
  });
  if (!template) throw new Error('Template not found');

  // Lade Assignment und Organization (angenommen, einsatz ist assignment)
  const assignment = await prisma.einsatz.findUnique({
    where: { id: assignmentId },
    include: { organization: true, einsatz_template: true },
  });
  if (!assignment) throw new Error('Assignment not found');

  // Baue ViewModel (hier formatierte Werte berechnen)
  const viewModel = {
    organization: {
      name: assignment.organization.name,
      email: assignment.organization.email || '',
      phone: assignment.organization.phone || '',
      signatureName: assignment.organization.name, // TODO: Aus organization_details.contact_person laden
      signatureRole: 'Verwalter:in', // TODO: Aus DB laden
    },
    assignment: {
      groupName: assignment.title,
      programName: assignment.einsatz_template?.name || 'Unbekannt',
      formattedDate: new Date(assignment.start).toLocaleDateString('de-DE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      formattedTimeRange: `${new Date(assignment.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${new Date(assignment.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
      formattedDateTimeRange: `${new Date(assignment.start).toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${new Date(assignment.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${new Date(assignment.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
      participantSummary: `${assignment.participant_count || 0} Teilnehmer:innen`,
      priceSummary: `€ ${assignment.price_per_person || 0}/Person bzw. € ${assignment.total_price || 0} gesamt`,
    },
  };

  return { template, viewModel };
}
