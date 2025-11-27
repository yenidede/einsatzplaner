export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="px-4 md:px-6 py-8">{children}</main>;
}
