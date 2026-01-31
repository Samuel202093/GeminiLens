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
  title: "Media → Data | Hackathon App",
  description: "Upload image or video and extract structured data with Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="page-wrap">
          <header className="container header">
            <div className="brand">
              <img src="/globe.svg" alt="Brand" width={24} height={24} />
              <div>
                <div className="brand-title">Hackathon App</div>
                <div className="brand-sub">Media → Data powered by Gemini</div>
              </div>
            </div>
          </header>
          <main className="container">
            {children}
          </main>
          <footer className="footer">
            Built with Next.js and Google Gemini
          </footer>
        </div>
      </body>
    </html>
  );
}
