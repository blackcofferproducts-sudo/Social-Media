import type { Metadata } from "next";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { DeskShell } from "@/components/desk-shell";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
});

const serif = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Engagement assistant",
  description:
    "Review replies for Pat Villaceran and CITY JAM. Nothing is sent without Pat's approval.",
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB">
      <body className={`${sans.variable} ${serif.variable} antialiased`}>
        <DeskShell>{children}</DeskShell>
      </body>
    </html>
  );
}
