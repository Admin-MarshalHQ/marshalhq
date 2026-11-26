import { randomUUID } from "node:crypto";

type Event = "demo_application_sent" | "demo_marshal_booked" | "waitlist_entry_created";

export function analyticsConfigured() {
  return Boolean(process.env.POSTHOG_PROJECT_TOKEN && process.env.POSTHOG_HOST);
}

// The server constructs the complete payload. Never forward request headers,
// form fields, booking details or stable identifiers to the analytics service.
export async function countEvent(event: Event) {
  if (!analyticsConfigured()) return;
  try {
    const response = await fetch(new URL("/i/v0/e/", process.env.POSTHOG_HOST), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(1500),
      body: JSON.stringify({
        api_key: process.env.POSTHOG_PROJECT_TOKEN,
        event,
        properties: {
          distinct_id: randomUUID(),
          $process_person_profile: false,
          $geoip_disable: true,
          environment: process.env.VERCEL_ENV || "development",
        },
      }),
    });
    if (!response.ok) console.warn("[analytics] capture rejected", response.status);
  } catch {
    console.warn("[analytics] capture unavailable");
  }
}
