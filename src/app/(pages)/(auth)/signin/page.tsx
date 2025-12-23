"use client";

import { Suspense, useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
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

  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      router.push("/");
    }
  }, [session?.user?.id, router]);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

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
    <div className="bg-secondary grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
            Anmelden
          </h2>
          <p className="text-sm pt-1">
            Falls Sie noch kein Konto haben, bitten Sie Ihren Administrator um
            eine Einladung.
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
            id="email"
            name="email"
          />
          <div>
            <FormField
              label="Passwort"
              type="password"
              value={password}
              onChange={setPassword}
              required
              placeholder="Ihr Passwort"
              className="mb-0"
              id="password"
              name="password"
            />

            <Button className="p-0" asChild variant="link">
              <Link href="/forgot-password" tabIndex={0}>
                Passwort vergessen?
              </Link>
            </Button>
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
