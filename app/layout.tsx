import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kingsgate CEO Dashboard",
  description:
    "Agency-wide view of Facebook Ads + GHL performance across all clients",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
