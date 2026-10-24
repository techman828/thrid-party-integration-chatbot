import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono, Inter, Manrope, Outfit, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import { templateBootScript } from "@/lib/templates";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Template fonts. Not preloaded: the browser only downloads the one the active template uses.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], preload: false });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"], preload: false });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], preload: false });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], preload: false });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], preload: false });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], preload: false });

const fontVars = [geistSans, geistMono, inter, poppins, dmSans, manrope, jakarta, outfit].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "OpenAI Chatbot",
  description: "Chat with any model on OneProvider, with saved history and collections.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The boot script sets the saved template's tokens on <html> before React hydrates.
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: templateBootScript() }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
