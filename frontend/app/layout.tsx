import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://idss-web-app.vercel.app"),
  title: "IDSS Piutang | Prediksi risiko keterlambatan pembayaran",
  description:
    "Sistem pendukung keputusan untuk memprediksi risiko keterlambatan pembayaran piutang dengan XGBoost dan MLP.",
  applicationName: "IDSS Piutang",
  keywords: [
    "IDSS",
    "piutang",
    "prediksi risiko",
    "machine learning",
    "xgboost",
    "mlp",
  ],
  openGraph: {
    title: "IDSS Piutang",
    description:
      "Prediksi risiko keterlambatan pembayaran piutang untuk membantu pengambilan keputusan kredit.",
    url: "/",
    siteName: "IDSS Piutang",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IDSS Piutang",
    description:
      "Prediksi risiko keterlambatan pembayaran piutang dengan model XGBoost dan MLP.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Lewati ke konten utama
        </a>
        <Providers>
          <Sidebar />
          <div className="md:pl-64 flex flex-col min-h-screen">
            <Header />
            <main id="main-content" className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
