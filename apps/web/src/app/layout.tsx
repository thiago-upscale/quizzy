import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://web-production-d2696.up.railway.app",
  ),
  title: {
    default: "Quizzy — Quiz ao vivo com a marca da sua empresa",
    template: "%s | Quizzy",
  },
  description:
    "Crie quizzes ao vivo com a identidade da sua empresa: PIN no telão, plateia no celular, ranking em tempo real e relatório pronto no fim. Para treinamentos, convenções e ativações internas.",
  openGraph: {
    title: "Quizzy — Quiz ao vivo com a marca da sua empresa",
    description:
      "PIN no telão, plateia no celular, ranking em tempo real e relatório pronto no fim. Com a sua marca em cada tela.",
    type: "website",
    locale: "pt_BR",
    siteName: "Quizzy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quizzy — Quiz ao vivo com a marca da sua empresa",
    description:
      "PIN no telão, plateia no celular, ranking em tempo real e relatório pronto no fim.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
