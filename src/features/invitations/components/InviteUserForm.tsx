"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Send, X, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface InviteUserFormProps {
  organizationId: string;
  onClose: () => void;
  isOpen: boolean;
}

export function InviteUserForm({
  organizationId,
  onClose,
  isOpen,
}: InviteUserFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/invitations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fehler beim Senden der Einladung");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSuccessMessage(`Einladung erfolgreich an ${email} gesendet!`);
      setEmail("");
      setErrorMessage("");
      queryClient.invalidateQueries({
        queryKey: ["invitations", organizationId],
      });

      // Auto-close nach 3 Sekunden
      setTimeout(() => {
        onClose();
        setSuccessMessage("");
      }, 3000);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
      setSuccessMessage("");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Bitte geben Sie eine E-Mail-Adresse ein");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage("Bitte geben Sie eine gültige E-Mail-Adresse ein");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await inviteMutation.mutateAsync(email);
      toast.success("Einladung erfolgreich gesendet.");
    } catch (error) {
      // Error is handled in onError
      toast.error("Fehler beim Senden der Einladung.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Benutzer einladen
              </h2>
              <p className="text-sm text-slate-600">
                Neue Mitglieder zur Organisation hinzufügen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 text-sm">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 text-sm">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="beispiel@email.de"
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                autoComplete="email"
              />
              <p className="text-xs text-slate-500 mt-1">
                Die Person erhält eine E-Mail mit einem Einladungslink
              </p>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-1">
                Was passiert als nächstes?
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Eine Einladungs-E-Mail wird versendet</li>
                <li>• Der Link ist 7 Tage gültig</li>
                <li>• Neue Benutzer erhalten die Rolle "Helfer"</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sende...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Einladung senden
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
