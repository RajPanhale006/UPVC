import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { APP_TITLE, COMPANY_NAME, COMPANY_TAGLINE, PRODUCT_NAME } from "@/lib/brand";
import { NativeShell } from "@/components/capacitor/native-shell";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_TITLE,
  description: `${COMPANY_NAME} — ${COMPANY_TAGLINE}`,
  applicationName: PRODUCT_NAME,
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col app-mesh-bg pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
        <NativeShell />
        {children}
      </body>
    </html>
  );
}
