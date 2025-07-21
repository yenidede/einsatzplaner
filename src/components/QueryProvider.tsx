"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef } from "react";

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClientRef = useRef<null | QueryClient>(null);
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }
  return (
    <QueryClientProvider client={queryClientRef.current}>
      {children}
    </QueryClientProvider>
  );
}