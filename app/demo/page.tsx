import type { Metadata } from "next";
import DemoWorkspace from "./DemoWorkspace";
import "./demo.css";

const title = "Try the Setru hiring demo";
const description = "Start on your marshal dashboard, find a UK film or TV shift and apply. Switch to the location manager’s view to review applicants and book the crew. Demo with sample data.";
const image = { url: "/brand/setru-social.png", width: 1200, height: 630, alt: "Setru · UK film and TV location marshal hiring" };
const base = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
  ? new URL(`https://${process.env.VERCEL_URL}`) : new URL("https://setru.co.uk");

export const metadata: Metadata = {
  metadataBase: base, title, description, alternates: { canonical: "/demo" },
  openGraph: { title, description, url: "/demo", type: "website", siteName: "Setru", locale: "en_GB", images: [image] },
  twitter: { card: "summary_large_image", title, description, images: [image] },
};

export default function DemoPage() {
  // Next Monday, at midday UTC. Keep the sample calls in the future and
  // pass a single anchor to the browser so server and client dates agree.
  const firstDay = new Date();
  firstDay.setUTCHours(12, 0, 0, 0);
  firstDay.setUTCDate(firstDay.getUTCDate() + ((8 - firstDay.getUTCDay()) % 7 || 7));
  return <DemoWorkspace firstDay={firstDay.toISOString()} />;
}
