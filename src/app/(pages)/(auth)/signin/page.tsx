"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, Alert } from "@/components/SimpleFormComponents";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function SignInContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const callbackUrl = searchParams.get("callbackUrl") || "/helferansicht";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ungültige Anmeldedaten");
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError(
        "Ein Fehler ist aufgetreten" +
          (err instanceof Error && err.message ? ": " + err.message : "")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Anmelden
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Oder{" "}
            <Button asChild variant="link">
              <Link
                href="/signup"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                hier registrieren, wenn Sie noch kein Konto haben
              </Link>
            </Button>
          </p>
        </div>

        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            label="E-Mail-Adresse"
            type="email"
            value={email}
            onChange={setEmail}
            required
            placeholder="ihre@email.com"
          />

          <FormField
            label="Passwort"
            type="password"
            value={password}
            onChange={setPassword}
            required
            placeholder="Ihr Passwort"
          />

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a
                href="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Passwort vergessen?
              </a>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Anmelden..." : "Anmelden"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Lade...</div>}>
      <SignInContent />
    </Suspense>
  );
}
