export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  // Minimal layout for admin login: do not render AdminSidebar or AdminHeader
  return <>{children}</>;
}
