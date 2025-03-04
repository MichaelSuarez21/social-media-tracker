import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Import AuthProvider and components
import { AuthProvider } from "@/lib/auth";
import HeaderManager from "@/components/HeaderManager";
import logger, { configureLogger } from "@/lib/logger";

// Configure logger on app initialization
configureLogger();

// Log app startup
logger.info('App', 'SocialTrack application initializing');

// Use Google Fonts
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: "SocialTrack - Social Media Analytics Dashboard",
    template: "%s | SocialTrack"
  },
  description: "Track, analyze, and optimize your social media performance across multiple platforms.",
  keywords: ["social media", "analytics", "dashboard", "tracking", "metrics"],
  authors: [
    {
      name: "Your Company",
      url: "https://yourcompany.com",
    },
  ],
  creator: "Your Company",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-900`}
      >
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <HeaderManager />

            <main className="flex-grow">
              {children}
            </main>

            <footer className="bg-gray-800 border-t border-gray-700 py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                  <div className="mb-4 md:mb-0">
                    <h3 className="text-xl font-bold text-white">SocialTrack</h3>
                    <p className="text-gray-400">Analyze and optimize your social media presence</p>
                  </div>
                  <div className="flex space-x-6">
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Terms</a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">Help</a>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
        
        {/* Include a simple script to handle localhost to 127.0.0.1 redirect */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Only execute on the client side
              if (typeof window !== 'undefined') {
                // Check if we're on localhost
                if (window.location.hostname === 'localhost') {
                  // Create a notification element
                  const notificationDiv = document.createElement('div');
                  notificationDiv.className = 'fixed bottom-4 right-4 max-w-md p-4 bg-amber-900 border border-amber-700 rounded-lg shadow-lg z-50';
                  notificationDiv.innerHTML = \`
                    <h3 class="text-lg font-medium text-amber-200">Twitter Integration Notice</h3>
                    <p class="mt-2 text-sm text-amber-300">
                      For Twitter OAuth to work properly, you should use <strong>127.0.0.1</strong> instead of <strong>localhost</strong>.
                    </p>
                    <div class="mt-3 flex justify-end">
                      <button class="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md">
                        Switch to 127.0.0.1
                      </button>
                    </div>
                  \`;
                  
                  // Append to body
                  document.body.appendChild(notificationDiv);
                  
                  // Add click handler to the button
                  notificationDiv.querySelector('button').addEventListener('click', () => {
                    // Replace localhost with 127.0.0.1 in URL
                    window.location.href = window.location.href.replace('localhost', '127.0.0.1');
                  });
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
