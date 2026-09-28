import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { PwaRegister } from "@/components/pwa-register";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CanaGest",
    template: "%s · CanaGest",
  },
  description:
    "Gestão de fazendas de cana-de-açúcar: cadastro de fazendas, talhões e registro de colheitas.",
  applicationName: "CanaGest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CanaGest",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f6b45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  let usuario = null;
  try {
    const session = await auth();
    if (session?.user?.id) {
      usuario = {
        nome: session.user.name,
        email: session.user.email,
        image: session.user.image,
      };
    }
  } catch {
    usuario = null;
  }

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} antialiased`}
    >
      <body>
        <PwaRegister />
        <AppShell usuario={usuario}>{children}</AppShell>
      </body>
    </html>
  );
}