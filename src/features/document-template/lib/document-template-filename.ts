export function filenamePart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export function createAssignmentDocumentFilename(args: {
  assignmentName: string;
  date: string;
  format: 'docx' | 'pdf';
}) {
  const baseName = filenamePart(args.assignmentName);

  return `${baseName || 'dokument'}_${args.date}.${args.format}`;
}
