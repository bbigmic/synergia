import "./globals.css";
import AuthStatus from "@/components/AuthStatus";
import BottomNavigation from "@/components/BottomNavigation";

export const metadata = {
  title: "Synergia",
  description: "AI misje dla par",
  manifest: "/manifest.json",
  themeColor: "#000000",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Synergia",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <div className="min-h-screen">
          <header className="p-4 border-b">
            <div className="max-w-6xl mx-auto flex justify-between">
              <a href="/" className="flex items-center gap-3">
                <img src="/logos/synergia-logo-no-background.png" alt="Synergia logo" className="w-8 h-8 sm:w-10 sm:h-10" />
                <span className="font-bold text-xl">Synergia</span>
              </a>
              <AuthStatus />
            </div>
          </header>
          <main>{children}</main>
          <BottomNavigation />
        </div>
      </body>
    </html>
  );
}