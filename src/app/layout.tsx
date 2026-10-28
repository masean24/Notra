import type { Metadata } from "next";
import { DM_Sans, Playfair_Display, IBM_Plex_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/palette/command-palette";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Notra — Your thoughts, smarter.",
    template: "%s — Notra",
  },
  description:
    "Notra is an AI-powered notes and knowledge workspace. Start writing instantly, no account required.",
  applicationName: "Notra",
  openGraph: {
    type: "website",
    siteName: "Notra",
    title: "Notra — Your thoughts, smarter.",
    description:
      "An AI-powered notes and knowledge workspace. Start writing instantly, no account required.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Notra — Your thoughts, smarter.",
    description:
      "An AI-powered notes and knowledge workspace. Start writing instantly, no account required.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${dmSans.variable} ${playfairDisplay.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          {children}
          <CommandPalette />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
