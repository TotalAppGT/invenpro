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
    default: "InvenPro | Sistema de Gestion de Inventario Profesional",
    template: "%s | InvenPro",
  },
  description:
    "Sistema de gestion de inventario multi-tenant disenado para empresas guatemaltecas. Controla multiples bodegas, productos, kardex automatizado, conteos fisicos, reportes avanzados y mas. 100% en la nube, sin instalacion.",
  keywords: [
    "inventario",
    "gestion de inventario",
    "kardex",
    "bodegas",
    "Guatemala",
    "control de stock",
    "multi-tenant",
    "sistema de inventario",
    "conteos fisicos",
    "codigos de barras",
    "InvenPro",
    "TotalAppGT",
  ],
  authors: [{ name: "TotalAppGT", url: "https://invenpro.app" }],
  creator: "TotalAppGT",
  publisher: "TotalAppGT",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://invenpro.app"),
  openGraph: {
    type: "website",
    locale: "es_GT",
    siteName: "InvenPro",
    title: "InvenPro | Sistema de Gestion de Inventario Profesional",
    description:
      "Sistema de gestion de inventario multi-tenant disenado para empresas guatemaltecas. Control total de tu inventario con kardex, conteos fisicos, reportes y mas.",
    url: "https://invenpro.app",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "InvenPro - Sistema de Gestion de Inventario",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InvenPro | Sistema de Gestion de Inventario Profesional",
    description:
      "Sistema de gestion de inventario multi-tenant disenado para empresas guatemaltecas.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%234f46e5'/><path d='M30 35h40v10H30zm0 15h40v8H30zm-6-20h52v40H24z' fill='white' opacity='0.9'/><path d='M24 30h52l-8 40H32z' fill='white'/></svg>",
        type: "image/svg+xml",
      },
    ],
    shortcut: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%234f46e5'/><path d='M30 35h40v10H30zm0 15h40v8H30zm-6-20h52v40H24z' fill='white' opacity='0.9'/><path d='M24 30h52l-8 40H32z' fill='white'/></svg>",
      },
    ],
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
        <meta name="application-name" content="InvenPro" />
        <meta name="apple-mobile-web-app-title" content="InvenPro" />
      </head>
      <body className="min-h-screen bg-[#0a0a1a] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
