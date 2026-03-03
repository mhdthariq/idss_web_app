import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IDSS Piutang — Sistem Pendukung Keputusan Cerdas",
  description:
    "Intelligent Decision Support System for Accounts Receivable Late Payment Risk Prediction using XGBoost and MLP Neural Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <Sidebar />
          <div className="md:pl-64 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
