export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="px-4 py-8 md:px-6">{children}</main>;
}
