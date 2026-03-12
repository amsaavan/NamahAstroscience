export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-layout min-h-screen text-sm">
      {children}
    </div>
  );
}
