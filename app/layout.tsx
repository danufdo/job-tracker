import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--f-display" });
const body = Figtree({ subsets: ["latin"], variable: "--f-body" });

export const metadata: Metadata = { title: "Job Tracker", description: "Track every application in one place." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
