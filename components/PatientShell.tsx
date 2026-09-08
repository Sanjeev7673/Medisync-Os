import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/requests/new", label: "New request" },
  { href: "/documents", label: "Documents" },
  { href: "/appointments", label: "Appointments" },
];

export default function PatientShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-[var(--border)] bg-[var(--panel)] px-6 py-8 hidden md:flex md:flex-col">
        <div className="flex items-center gap-2 mb-10">
          <div className="h-8 w-8 rounded-md bg-[var(--care)] flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">M</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight">MediSync</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--care-soft)] hover:text-[var(--ink)] transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-8 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] leading-relaxed">Your MediSync account</p>
          <Link href="/api/auth/logout" className="text-xs text-[var(--care)] hover:underline">Sign out securely</Link>
        </div>
      </aside>
      <main className="flex-1 px-6 py-8 md:px-12 md:py-10 max-w-5xl">{children}</main>
    </div>
  );
}
