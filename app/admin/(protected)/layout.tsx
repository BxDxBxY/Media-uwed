import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  PlusCircle,
  Bot,
  ShieldCheck,
  FileBadge,
} from "lucide-react";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";
import { AdminAssistantChat } from "@/components/admin-assistant-chat";
import { ModeToggle } from "@/components/mode-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSessionFromCookies();
  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 h-screen sticky top-0 bg-muted/30 border-r border-border/40 hidden md:flex flex-col relative">
        <div className="p-6 border-b border-border/40">
          <Link href="/" className="font-serif text-xl font-bold">University Media</Link>
          <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto pb-24">
          <NavItem href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
            Dashboard
          </NavItem>
          <NavItem href="/admin/articles" icon={<FileText className="h-4 w-4" />}>
            Articles
          </NavItem>
          <NavItem href="/admin/events" icon={<Calendar className="h-4 w-4" />}>
            Events
          </NavItem>
          <NavItem href="/admin/media" icon={<LayoutDashboard className="h-4 w-4" />}>
            Media Hub
          </NavItem>
          <NavItem href="/admin/connections" icon={<PlusCircle className="h-4 w-4" />}>
            Connections
          </NavItem>
          <NavItem href="/admin/about" icon={<FileText className="h-4 w-4" />}>
            About Us
          </NavItem>
          <NavItem href="/admin/automation" icon={<Bot className="h-4 w-4" />}>
            Automation
          </NavItem>
          <NavItem href="/admin/privacy-policy" icon={<ShieldCheck className="h-4 w-4" />}>
            Privacy Policy
          </NavItem>
          <NavItem href="/admin/terms-of-use" icon={<FileBadge className="h-4 w-4" />}>
            Terms of Use
          </NavItem>
          <NavItem href="/admin/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </NavItem>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/40 bg-muted/40 backdrop-blur-sm">
          <AdminLogoutButton />
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 bg-background/95 backdrop-blur">
          <h2 className="font-semibold">Dashboard</h2>
          <div className="flex items-center gap-4">
            <ModeToggle />
            <span className="text-sm text-muted-foreground">Welcome, Admin</span>
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              A
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 overflow-auto">{children}</main>
        <AdminAssistantChat />
      </div>
    </div>
  );
}

function NavItem({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-background/80 hover:text-primary transition-colors text-muted-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
