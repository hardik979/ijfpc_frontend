import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Head from "next/head";
<<<<<<< HEAD
import { ClerkProvider } from "@clerk/nextjs";
=======
import ToastProvider from "@/components/ToastProvider";
>>>>>>> 2cb5d26144738e057d4e93814d0714dc695ef606

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
<<<<<<< HEAD
    <ClerkProvider>
      <html lang="en">
        <Head>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
=======
    <html lang="en">
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
>>>>>>> 2cb5d26144738e057d4e93814d0714dc695ef606
  );
}
