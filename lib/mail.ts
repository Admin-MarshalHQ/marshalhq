/**
 * Transactional email sender.
 *
 * If RESEND_API_KEY is set, sends via the Resend REST API.
 * Otherwise logs the email to the server console (dev default).
 *
 * Never throws — email is a best-effort side channel and must not break
 * the server action that triggered it. Failures are logged with a
 * consistent `[mail]` prefix so they can be grepped in server logs.
 */

type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
};

export type SendEmailResult =
  | { ok: true; channel: "resend" | "console" }
  | { ok: false; reason: string };

export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM ?? "MarshalHQ <no-reply@marshalhq.local>";
  const isProd = process.env.NODE_ENV === "production";

  if (!apiKey) {
    // Dev fallback: log the full email body so developers can copy reset
    // links out of the console when no email provider is configured.
    //
    // Production must NEVER take this branch — if it does, we refuse to log
    // the body (which could contain a reset URL, token, or other sensitive
    // payload) and surface a clear configuration error instead. The caller
    // treats ok:false as "email did not send" and reacts accordingly (e.g.
    // invalidating an unemailable reset token).
    if (isProd) {
      console.error(
        "[mail] RESEND_API_KEY is not set in production; refusing to log email body",
        { to: params.to, subject: params.subject },
      );
      return { ok: false, reason: "misconfigured_no_api_key" };
    }
    console.log(
      `[mail:dev] to=${params.to} subject="${params.subject}"\n${params.body}`,
    );
    return { ok: true, channel: "console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        text: params.body,
      }),
    });
    if (!res.ok) {
      // Resend's error response body doesn't include our email payload, but
      // we keep the logged fields narrow anyway: to/subject/status only.
      // Never log params.body — it could carry a reset URL or token.
      const providerBody = isProd ? "<redacted>" : await res.text();
      console.error("[mail] Resend rejected request", {
        to: params.to,
        subject: params.subject,
        status: res.status,
        providerBody,
      });
      return { ok: false, reason: `resend_${res.status}` };
    }
    return { ok: true, channel: "resend" };
  } catch (err) {
    // Never include `err.message` verbatim here — a rejected fetch can echo
    // the request body in some runtimes. Emit only a static reason code.
    console.error("[mail] send failed", {
      to: params.to,
      subject: params.subject,
      errName: err instanceof Error ? err.name : "unknown",
    });
    return { ok: false, reason: "network_error" };
  }
}
