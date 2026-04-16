import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://revenueintelligence.co.uk"),
  title: {
    default: "RevInt — Revenue Intelligence for SaaS Founders",
    template: "%s | RevInt",
  },
  description: "RevInt connects to Stripe and watches your revenue for you. MRR, churn alerts, AI briefings, and revenue forecasting — so you never lose a customer you could have kept.",
  keywords: ["SaaS revenue", "MRR dashboard", "Stripe analytics", "churn alerts", "revenue intelligence", "SaaS metrics"],
  authors: [{ name: "RevInt" }],
  creator: "RevInt",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://revenueintelligence.co.uk",
    siteName: "RevInt",
    title: "RevInt — Revenue Intelligence for SaaS Founders",
    description: "Connect Stripe in 30 seconds. See who's at risk, forecast your MRR, and save customers before they cancel.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RevInt — Revenue Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RevInt — Revenue Intelligence for SaaS Founders",
    description: "Connect Stripe in 30 seconds. See who's at risk, forecast your MRR, and save customers before they cancel.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://revenueintelligence.co.uk",
  },
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
