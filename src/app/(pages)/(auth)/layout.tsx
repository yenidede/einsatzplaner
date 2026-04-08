import { AuthScrollLock } from './AuthScrollLock';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AuthScrollLock />
      <main className="flex h-dvh min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </>
  );
}
