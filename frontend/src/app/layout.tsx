import type { Metadata, Viewport } from "next";
import { Toaster } from 'react-hot-toast';

import "./globals.css";
import { BiometricGuard } from "@/components/BiometricGuard";

export const metadata: Metadata = {
  title: "Lumina",
  description: "AI-Powered Personal Finance Tracker",
  manifest: "/manifest.json",
  icons: {
    icon: "/lumina_icon.png",
    apple: "/lumina_icon.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lumina",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1021",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#0B1021] overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased bg-[#0B1021] text-foreground min-h-screen overflow-x-hidden w-full">
        <main className="w-full max-w-md mx-auto min-h-screen relative bg-[#0B1021] pb-20 overflow-x-hidden">
          <BiometricGuard>
            {children}
          </BiometricGuard>
        </main>
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(255,255,255,0.1)',
            }
          }}
        />
      </body>
    </html>
  );
}
