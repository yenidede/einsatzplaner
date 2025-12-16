"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, Alert, Button } from "@/components/SimpleFormComponents";
import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

interface ResetPasswordPageProps {
  token: string;
}
type PageProps = {
  searchParams?: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params?.token;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <ResetPasswordClient token={token} />
    </Suspense>
  );
}
