import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "InvenPro - Sistema de Gestión de Inventario",
    template: "%s | InvenPro",
  },
  description:
    "InvenPro es el sistema de gestión de inventario multi-tenant líder en Guatemala. Controla múltiples bodegas, productos, kardex automatizado, conteos físicos, reportes avanzados y más. Diseñado para empresas guatemaltecas que buscan profesionalizar su control de inventario.",
  keywords: [
    "inventario",
    "gestión de inventario",
    "kardex",
    "bodegas",
    "Guatemala",
    "control de stock",
    "multi-tenant",
    "sistema de inventario",
    "conteos físicos",
    "códigos de barras",
  ],
  authors: [{ name: "InvenPro Guatemala" }],
  creator: "InvenPro",
  metadataBase: new URL("https://invenpro.app"),
  openGraph: {
    type: "website",
    locale: "es_GT",
    siteName: "InvenPro",
    title: "InvenPro - Sistema de Gestión de Inventario",
    description:
      "Controla tu inventario como nunca antes. Multi-tenant, multi-bodega, tiempo real. El sistema líder en Guatemala.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${syne.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen bg-[#0a0a1a] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
