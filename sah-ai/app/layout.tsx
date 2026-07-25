import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { HotlineFooter } from "./components/hotline-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sah-AI — Recovery Support",
  description:
    "Voice-first, zero-typing AI support for substance use recovery. " +
    "Not a replacement for 988, SAMHSA, or clinical care.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <main id="main-content">{children}</main>
        <HotlineFooter />
      </body>
    </html>
  );
}
