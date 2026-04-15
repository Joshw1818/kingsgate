import Link from "next/link";
import { logoutAction } from "../login/actions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-semibold text-brand">
              Kingsgate
            </Link>
            <nav className="flex items-center gap-6 text-sm text-slate-600">
              <Link href="/dashboard" className="hover:text-brand">
                Overview
              </Link>
              <Link href="/dashboard/clients" className="hover:text-brand">
                Clients
              </Link>
              <Link href="/dashboard/reports" className="hover:text-brand">
                Reports
              </Link>
            </nav>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-sm text-slate-500 hover:text-brand"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
