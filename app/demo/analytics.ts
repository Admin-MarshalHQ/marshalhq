"use server";

import { analyticsConfigured, countEvent } from "@/lib/product-analytics";
import { allowRequest } from "@/lib/request-budget";

export async function countDemoAction(action: "apply" | "accept") {
  if (!analyticsConfigured() || (action !== "apply" && action !== "accept")) return;
  if (!(await allowRequest("demoAnalytics", "public-demo"))) return;
  await countEvent(action === "apply" ? "demo_application_sent" : "demo_marshal_booked");
}
