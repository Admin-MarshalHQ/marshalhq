import { requireFounder } from "@/lib/access";
import FounderNav from "./FounderNav";

export default async function FounderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Re-assert the founder guard at layout level — middleware is the primary
  // gate, but a server-side check here means every founder page renders with
  // a verified session even if middleware config changes later.
  await requireFounder();
  return (
    <div>
      <FounderNav />
      {children}
    </div>
  );
}
