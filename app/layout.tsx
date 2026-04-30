import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "./client-layout";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://revenueintelligence.co.uk"),
  title: {
    default: "Revenue Intelligence — Revenue Recovery Platform for SaaS",
    template: "%s | Revenue Intelligence",
  },
  description: "Detect failed payments, at-risk customers, and silent churn across Stripe, Paddle, and Revolut. Recover revenue before it's gone.",
  keywords: ["SaaS revenue recovery", "failed payment recovery", "MRR dashboard", "churn alerts", "revenue intelligence", "SaaS metrics"],
  authors: [{ name: "Revenue Intelligence" }],
  creator: "Revenue Intelligence",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://revenueintelligence.co.uk",
    siteName: "Revenue Intelligence",
    title: "Revenue Intelligence — Revenue Recovery Platform for SaaS",
    description: "Detect failed payments, at-risk customers, and silent churn across Stripe, Paddle, and Revolut. Recover revenue before it's gone.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Revenue Intelligence — Revenue Recovery Platform for SaaS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Revenue Intelligence — Revenue Recovery Platform for SaaS",
    description: "Detect failed payments, at-risk customers, and silent churn across Stripe, Paddle, and Revolut. Recover revenue before it's gone.",
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-950 flex`}>
        <Providers>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
