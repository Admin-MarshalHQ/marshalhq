import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Hero } from "@/components/landing/Hero";
import { PreviewCards } from "@/components/landing/PreviewCards";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { BuiltOnTrust } from "@/components/landing/BuiltOnTrust";
import { ValueCards } from "@/components/landing/ValueCards";
import { BottomCTA } from "@/components/landing/BottomCTA";
import { MarketingFooter } from "@/components/landing/MarketingFooter";

export default async function Landing() {
  const session = await auth();
  if (session?.user?.id) {
    if (session.user.role === "MANAGER") redirect("/manager");
    if (session.user.role === "MARSHAL") redirect("/marshal");
  }

  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] -my-6 w-screen bg-brand-cream">
      <Hero />
      <PreviewCards />
      <TrustStrip />
      <HowItWorks />
      <BuiltOnTrust />
      <ValueCards />
      <BottomCTA />
      <MarketingFooter />
    </div>
  );
}
