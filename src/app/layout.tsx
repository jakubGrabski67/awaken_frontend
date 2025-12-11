import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  title: "IDML Translator",
  description: "Upload and translate your IDML files with ease.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className="h-full">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased thin-scrollbar">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
