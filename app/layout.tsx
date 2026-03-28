import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "RevInt — Revenue Intelligence",
  description: "Understand your Stripe revenue at a glance. MRR, churn, growth and customer insights in one dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 flex`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
