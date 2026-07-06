import { describe, expect, it } from 'vitest';
import { createAssignmentDocumentFilename } from './document-template-filename';

describe('createAssignmentDocumentFilename', () => {
  it('verwendet den Einsatznamen für den Export-Dateinamen', () => {
    expect(
      createAssignmentDocumentFilename({
        assignmentName: 'Sommerfest Wien',
        date: '2026-07-24',
        format: 'pdf',
      })
    ).toBe('Sommerfest_Wien_2026-07-24.pdf');
  });

  it('verwendet bei einem ungeeigneten Einsatznamen einen neutralen Namen', () => {
    expect(
      createAssignmentDocumentFilename({
        assignmentName: '🎉',
        date: '2026-07-24',
        format: 'docx',
      })
    ).toBe('dokument_2026-07-24.docx');
  });
});
