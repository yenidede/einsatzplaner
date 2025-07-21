"use client";
import Link from "next/link";

import { useState } from "react";
import EinsatzForm from "@/features/einsatz-old/components/EinsatzForm";
import EinsatzList from "@/features/einsatz-old/components/EinsatzList";
import { Einsatz } from "@/features/einsatz-old/types/einsatz";

export default function EinsaetzeManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingEinsatz, setEditingEinsatz] = useState<Einsatz | null>(null);

  const handleCreateNew = () => {
    setEditingEinsatz(null);
    setShowForm(true);
  };

  const handleEditEinsatz = (einsatz: Einsatz) => {
    setEditingEinsatz(einsatz);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEinsatz(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingEinsatz(null);
  };

  // ESC key handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleFormCancel();
    }
  };

  if (showForm) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
          <EinsatzForm
            einsatzId={editingEinsatz?._id}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <EinsatzList
      onCreateNew={handleCreateNew}
      onEditEinsatz={handleEditEinsatz}
    />
  );
}
