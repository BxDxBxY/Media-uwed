import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Toaster } from "sonner";
import Script from "next/script";
import { getPublicSiteUrl } from "@/lib/site-url";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: "Media Uwed",
    template: "%s | Media Uwed",
  },
  description:
    "Media Uwed publishes verified news, analysis, events, and multimedia stories for a global audience.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Media Uwed",
    description:
      "Read the latest headlines, in-depth analysis, and multimedia stories from Media Uwed.",
    type: "website",
    siteName: "Media Uwed",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Media Uwed",
    description:
      "Read the latest headlines, in-depth analysis, and multimedia stories from Media Uwed.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme" strategy="beforeInteractive">{`
      (function () {
        try {
          var theme = localStorage.getItem('theme');
          var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          var dark = theme === 'dark' || (!theme && systemDark);
          document.documentElement.classList.toggle('dark', dark);
          document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        } catch (e) {}
      })();
    `}</Script>
        <Script id="org-schema" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Media Uwed",
            url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            logo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/logo.png`,
          })}
        </Script>
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
      >
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
