import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import NextAuthSessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/navbar/navbar-main";
import QueryProvider from "@/components/QueryProvider";
import "@/styles/globals.css";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sonner";
import { AlertDialogContextProvider } from "@/contexts/AlertDialogContext";
import { EventDialogProvider } from "@/contexts/EventDialogContext";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Einsatzplaner",
  description:
    "Maturaprojekt der HAK DigBiz 5ADB 2025/26. (c) David Kathrein, Ömer Yenidede, Luca Raffeiner",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <NuqsAdapter>
          <QueryProvider>
            <NextAuthSessionProvider>
              <AlertDialogContextProvider>
                <EventDialogProvider>
                  <Navbar />
                  {children}
                  <Toaster position="bottom-left" richColors />
                </EventDialogProvider>
              </AlertDialogContextProvider>
            </NextAuthSessionProvider>
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
