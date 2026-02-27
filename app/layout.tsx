import type { Metadata } from "next";
import { Barlow_Condensed, Six_Caps } from "next/font/google";
import "./globals.css";

const sixCaps = Six_Caps({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
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
      <body className={`${sixCaps.variable} ${barlowCondensed.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
