import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { WalletProvider } from "@/components/wallet-provider";
import { NetworkProvider } from "@/context/network-context";
import { CurrencyProvider } from "@/context/currency-context";

export const metadata: Metadata = {
  title: "Movement Network - Connect Wallet Template",
  description: "A Next.js template for building dApps on Movement Network with wallet integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NetworkProvider>
            <CurrencyProvider>
              <WalletProvider>
                {children}
                <Toaster />
              </WalletProvider>
            </CurrencyProvider>
          </NetworkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}



