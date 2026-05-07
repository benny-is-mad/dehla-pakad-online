import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";

export const metadata: Metadata = {
  title: "Dehla Pakad Online — Royal Indian Card Game",
  description:
    "Play the classic Indian card game Dehla Pakad online with friends or bots. Real-time multiplayer, ranked matches, and a stunning Royal Indian interface.",
  keywords: ["dehla pakad", "indian card game", "online card game", "multiplayer"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — loaded at browser runtime (avoids build-time resolution issues) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
