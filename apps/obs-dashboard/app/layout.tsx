import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Genesis Observability - LLM Usage Dashboard",
  description: "Monitor and analyze LLM API usage, costs, and performance metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container mx-auto px-4 py-4">
                <h1 className="text-2xl font-bold">Genesis Observability</h1>
                <p className="text-sm text-muted-foreground">LLM Usage Monitoring</p>
              </div>
            </header>
            <main className="container mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
