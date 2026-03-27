"use client";

import "./globals.css";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";


export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 flex">

        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-6 relative">
          <div className="mb-8">
  <h2 className="text-xl font-semibold">MRRPilot</h2>
  <p className="text-xs text-gray-500">
    Revenue intelligence
  </p>
</div>

          <nav className="space-y-1">

  <Link href="/">
    <div
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
        pathname === "/"
          ? "bg-gray-100 text-black font-medium"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      📊 Dashboard
    </div>
  </Link>

  <Link href="/customers">
    <div
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
        pathname === "/customers"
          ? "bg-gray-100 text-black font-medium"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      👤 Customers
    </div>
  </Link>

  <Link href="/settings">
    <div
      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
        pathname === "/settings"
          ? "bg-gray-100 text-black font-medium"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      ⚙️ Settings
    </div>
  </Link>

</nav>
<div className="absolute bottom-6 left-6 right-6">
  <div className="p-3 rounded-lg border border-gray-200 text-sm text-gray-600">
    <p className="font-medium">Brendan</p>
    <p className="text-xs text-gray-400">
      brendan@...
    </p>
  </div>
</div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {children}
        </div>

      </body>
    </html>
  );
}