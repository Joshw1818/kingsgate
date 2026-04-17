import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UK Contractor Accommodation, Sourced in 2 Hours | Housd",
  description:
    "Free quote within 2 working hours. Serviced apartments and houses across the UK for contractor and workforce stays. Save ~25% vs booking sites.",
  openGraph: {
    title: "UK Contractor Accommodation, Sourced in 2 Hours",
    description:
      "Fixed project rates. Vetted properties. Dedicated account manager. Quote in under 2 hours.",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function HousdLPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-housd-sand text-housd-ink">{children}</div>
  );
}
