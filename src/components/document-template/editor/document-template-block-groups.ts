import {
  FileText,
  Heading1,
  Highlighter,
  ImageIcon,
  Info,
  List,
  Minus,
  PanelBottom,
  PanelTop,
  Signature,
  Table2,
  Type,
  type LucideIcon,
} from 'lucide-react';

export type DocumentTemplateBlockGroup = {
  label: string;
  items: Array<{
    id: string;
    label: string;
    description: string;
    Icon: LucideIcon;
  }>;
};

export const documentTemplateBlockGroups: DocumentTemplateBlockGroup[] = [
  {
    label: 'Basis',
    items: [
      {
        id: 'heading',
        label: 'Überschrift',
        description: 'Großer Abschnittstitel für Ihr Dokument.',
        Icon: Heading1,
      },
      {
        id: 'paragraph',
        label: 'Text',
        description: 'Fließtext, den Sie direkt auf der Seite bearbeiten.',
        Icon: Type,
      },
      {
        id: 'divider',
        label: 'Trennlinie',
        description: 'Dezente Linie zur optischen Trennung.',
        Icon: Minus,
      },
    ],
  },
  {
    label: 'Layout',
    items: [
      {
        id: 'infoBox',
        label: 'Infobox',
        description: 'Hervorgehobener Bereich für wichtige Informationen.',
        Icon: Info,
      },
      {
        id: 'table',
        label: 'Datenübersicht',
        description: 'Strukturierte Übersicht mit Zeilen und Spalten.',
        Icon: Table2,
      },
      {
        id: 'columns',
        label: 'Zweispaltig',
        description: 'Zwei zusammengehörige Textspalten.',
        Icon: Highlighter,
      },
    ],
  },
  {
    label: 'Dokument',
    items: [
      {
        id: 'header',
        label: 'Kopfbereich',
        description: 'Aktiviert und bearbeitet den festen Kopfbereich.',
        Icon: PanelTop,
      },
      {
        id: 'footer',
        label: 'Fußbereich',
        description: 'Aktiviert und bearbeitet den festen Fußbereich.',
        Icon: PanelBottom,
      },
      {
        id: 'pageNumber',
        label: 'Seitenzahl',
        description: 'Fügt eine Seitenzahl in den Fußbereich ein.',
        Icon: FileText,
      },
      {
        id: 'signature',
        label: 'Signaturbereich',
        description: 'Grußformel mit Name und Funktion.',
        Icon: Signature,
      },
      {
        id: 'pageBreak',
        label: 'Seitenumbruch',
        description: 'Beginnt den folgenden Inhalt auf einer neuen Seite.',
        Icon: List,
      },
    ],
  },
  {
    label: 'Medien',
    items: [
      {
        id: 'image',
        label: 'Bild',
        description: 'Fügt ein hochgeladenes Bild in den aktiven Bereich ein.',
        Icon: ImageIcon,
      },
      {
        id: 'logo',
        label: 'Logo',
        description: 'Fügt das Organisationslogo in den Kopfbereich ein.',
        Icon: ImageIcon,
      },
    ],
  },
];
