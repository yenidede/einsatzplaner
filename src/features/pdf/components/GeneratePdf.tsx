"use client";

import { useState } from "react";
import { usePdfGenerator } from "../hooks/usePdfGenerator";
import { PdfGenerationRequest } from "../types/pdf";
import { Button } from "@/components/SimpleFormComponents";
import { Badge } from "@/components/ui/badge";

interface GeneratePdfProps {
  einsatzId: string;
  einsatzTitle?: string;
}

export function GeneratePdf({ einsatzId, einsatzTitle }: GeneratePdfProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState({
    showLogos: true,
    showContactInfo: true,
    includeTerms: true,
  });

  const { generatePdf, isGenerating, error } = usePdfGenerator();

  const handleExport = async () => {
    const request: PdfGenerationRequest = {
      type: "booking-confirmation",
      einsatzId,
    };

    const result = await generatePdf(request);
    if (result?.success) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <Badge onClick={handleExport}>PDF generieren</Badge>
    </>
  );
}