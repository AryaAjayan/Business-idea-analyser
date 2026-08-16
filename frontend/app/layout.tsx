import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Business Idea Analyzer",
  description: "A voice-first AI advisor that stress-tests your business idea in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans text-white bg-void antialiased">
        {children}
      </body>
    </html>
  );
}
