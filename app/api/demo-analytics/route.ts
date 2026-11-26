import { analyticsConfigured, countEvent } from "@/lib/product-analytics";
import { allowRequest } from "@/lib/request-budget";

export async function POST(request: Request) {
  const url = new URL(request.url);
  // The custom header requires a preflight for cross-origin browser requests.
  if (request.headers.get("X-Setru-Demo") !== "1") return new Response(null, { status: 403 });
  const action = url.searchParams.get("action");
  if (action !== "apply" && action !== "accept") return new Response(null, { status: 400 });

  if (analyticsConfigured() && await allowRequest("demoAnalytics", "public-demo", request.headers)) {
    await countEvent(action === "apply" ? "demo_application_sent" : "demo_marshal_booked");
  }
  return new Response(null, { status: 204 });
}
