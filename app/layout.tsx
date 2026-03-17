import type { Metadata } from "next";
import { Barlow_Condensed, Six_Caps, Cormorant_Garamond, Merriweather } from "next/font/google";
import "./globals.css";

const sixCaps = Six_Caps({
  variable: "--font-admin-display",
  weight: "400",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-admin-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-user-display",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-user-body",
  weight: ["300", "400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Namah Astroscience",
  description: "Vedic astrology consultations and guidance.",
  icons: {
    icon: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${sixCaps.variable} ${barlowCondensed.variable} ${cormorantGaramond.variable} ${merriweather.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
