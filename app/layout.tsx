import "./globals.css";

export const metadata = {
  title: "Synergia",
  description: "AI missions for couples",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}