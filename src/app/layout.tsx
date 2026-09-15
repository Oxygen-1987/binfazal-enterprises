// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/theme-provider";
import { AuthProvider } from "@/context/auth-context";
import { BusinessProvider } from "@/context/business-context";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BinFazal Enterprises",
  description: "Print Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <BusinessProvider>
              {children}
              <Toaster position="top-center" richColors closeButton />
            </BusinessProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
