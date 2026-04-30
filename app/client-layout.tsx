"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Settings, LogOut, Menu, X, TrendingUp, Repeat2, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = pathname === "/login" || pathname === "/" || pathname === "/demo" || pathname.startsWith("/revenue/");
  const isAuthPage = pathname === "/login" || pathname === "/";
  const [userEmail, setUserEmail] = useState("");
  const [userInitial, setUserInitial] = useState("?");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session && !isPublic) router.replace("/login");
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setUserInitial(session.user.email[0].toUpperCase());
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") router.replace("/");
      if (event === "SIGNED_IN" && isAuthPage) router.replace("/dashboard");
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setUserInitial(session.user.email[0].toUpperCase());
      }
    });

    return () => subscription.unsubscribe();
  }, [isPublic, router]);

  // Close sidebar when route changes on mobile
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Customers",  icon: Users           },
    { href: "/forecast",  label: "Forecast",   icon: TrendingUp      },
    { href: "/retention", label: "Retention",  icon: Repeat2         },
    { href: "/settings",  label: "Settings",   icon: Settings        },
  ];

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="px-5 py-6 border-b border-gray-100 dark:border-gray-800">
        <p className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">Revenue Intelligence</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Revenue Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}>
              <div className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                active
                  ? "text-indigo-700 dark:text-indigo-300 font-semibold bg-indigo-50/70 dark:bg-indigo-900/30"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-500 rounded-full" />}
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{userEmail || "…"}</p>
          </div>
        </div>
        <a
          href="mailto:brendan.mcintosh@outlook.com"
          className="w-full flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors py-1 mb-1"
        >
          Questions? Get in touch
        </a>
        <div className="flex items-center justify-between">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-1"
          >
            <LogOut size={13} strokeWidth={1.8} />
            Sign out
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={13} strokeWidth={1.8} /> : <Moon size={13} strokeWidth={1.8} />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {!isPublic && (
        <>
          {/* Mobile top bar */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-20 h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 flex items-center justify-between shrink-0">
            <p className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">Revenue Intelligence</p>
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={18} strokeWidth={1.8} /> : <Menu size={18} strokeWidth={1.8} />}
            </button>
          </div>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/20"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar — desktop: static flex item; mobile: fixed drawer */}
          <div className={`
            w-56 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col shrink-0
            fixed inset-y-0 left-0 z-40 transition-transform duration-200
            md:relative md:translate-x-0 md:transition-none
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}>
            {sidebarContent}
          </div>
        </>
      )}

      {/* Main content — offset top on mobile for the fixed top bar */}
      <div className={`flex-1 overflow-auto ${!isPublic ? "pt-14 md:pt-0" : ""}`}>
        {children}
      </div>
    </>
  );
}
