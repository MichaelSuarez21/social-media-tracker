import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Import AuthProvider and components
import { AuthProvider } from "@/lib/auth";
import PublicHeader from "@/components/PublicHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Media Tracker",
  description: "Monitor and analyze all your social media accounts in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-900`}
      >
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <PublicHeader />

            <main className="flex-grow">
              {children}
            </main>

            <footer className="bg-gray-800 border-t border-gray-700 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="mb-4 md:mb-0">
                    <p className="text-gray-400">
                      © 2024 SocialTrack. All rights reserved.
                    </p>
                  </div>
                  <div className="flex space-x-6">
                    <a href="/privacy" className="text-gray-400 hover:text-gray-300">
                      Privacy
                    </a>
                    <a href="/terms" className="text-gray-400 hover:text-gray-300">
                      Terms
                    </a>
                    <a href="/contact" className="text-gray-400 hover:text-gray-300">
                      Contact
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
