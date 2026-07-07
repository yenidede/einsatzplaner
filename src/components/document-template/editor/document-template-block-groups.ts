import {
  Heading1,
  Highlighter,
  ImageIcon,
  Info,
  List,
  Minus,
  MoveVertical,
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
    label: 'Text',
    items: [
      {
        id: 'heading',
        label: 'Überschrift',
        description: 'Großer Abschnittstitel für Ihr Dokument.',
        Icon: Heading1,
      },
      {
        id: 'paragraph',
        label: 'Textabschnitt',
        description: 'Fließtext, den Sie direkt auf der Seite bearbeiten.',
        Icon: Type,
      },
    ],
  },
  {
    label: 'Struktur / Layout',
    items: [
      {
        id: 'dataOverview',
        label: 'Datenübersicht',
        description: 'Vorbereitete Übersicht für zentrale Dokumentdaten.',
        Icon: Table2,
      },
      {
        id: 'table',
        label: 'Tabelle',
        description: 'Freie Tabelle mit Zeilen und Spalten.',
        Icon: Table2,
      },
      {
        id: 'columns',
        label: 'Zweispaltig',
        description: 'Zwei zusammengehörige Textspalten.',
        Icon: Highlighter,
      },
      {
        id: 'infoBox',
        label: 'Infobox',
        description: 'Hervorgehobener Bereich für wichtige Informationen.',
        Icon: Info,
      },
      {
        id: 'divider',
        label: 'Trennlinie',
        description: 'Dezente Linie zur optischen Trennung.',
        Icon: Minus,
      },
      {
        id: 'spacer',
        label: 'Abstand',
        description: 'Kontrollierter Leerraum zwischen zwei Inhalten.',
        Icon: MoveVertical,
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
    label: 'Abschluss',
    items: [
      {
        id: 'signature',
        label: 'Signaturbereich',
        description: 'Grußformel mit Name und Funktion.',
        Icon: Signature,
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
        label: 'Organisationslogo',
        description: 'Fügt das gespeicherte Organisationslogo ein.',
        Icon: ImageIcon,
      },
    ],
  },
];
