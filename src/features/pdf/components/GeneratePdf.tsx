"use client";

import { useState } from "react";
import { usePdfGenerator } from "../hooks/usePdfGenerator";
import { PdfGenerationRequest } from "../types/pdf";

interface GeneratePdfProps {
  einsatzId: string;
  einsatzTitle?: string;
}

export const GeneratePdf = ({ einsatzId, einsatzTitle }: GeneratePdfProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { generatePdf, error } = usePdfGenerator();

  const handleExport = async () => {
    const request: PdfGenerationRequest = {
      type: "booking-confirmation",
      einsatzId,
    };

    const result = await generatePdf(request);
    if (!result) {
      console.error("Fehler beim Generieren der PDF:", error);
    }
  };

  return (
    <>
      <button
        onClick={handleExport}
        className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800"
      >
        PDF exportieren
      </button>
    </>
  );
};

