import { WAITLIST_NEXT_STEP } from "./copy";
import { WAITLIST_ROLE_LABEL, type WaitlistRole } from "./types";

// Use the public site rather than a preview URL or the private founder origin.
const supportUrl = "https://setru.co.uk/support";
const privacyUrl = "https://setru.co.uk/privacy";

export function waitlistConfirmationEmail(role: WaitlistRole) {
  const subject = "We received your Setru waitlist request";
  const headline = "You’re on the waitlist";
  const introduction = "Thanks for joining Setru, the staffing platform for UK film and TV location teams.";
  // Only the validated role label is included; don't echo free-text form fields.
  const roleLabel = WAITLIST_ROLE_LABEL[role];
  const status = "We’ve saved your request. This isn’t an account or an invitation to the private beta yet.";
  const help = "To update or remove your request, use Setru support.";

  const body = [
    headline,
    `${introduction}\n\nRole submitted: ${roleLabel}`,
    status,
    WAITLIST_NEXT_STEP,
    `${help}\nSupport: ${supportUrl}\nPrivacy: ${privacyUrl}`,
    "The Setru team",
  ].join("\n\n");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#FFF7F2;color:#0F172A;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFF7F2">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="560" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:560px;border:1px solid #E7E3E0;border-radius:16px;">
<tr><td style="padding:24px 24px 20px;background:#0F172A;color:#FFFFFF;border-radius:15px 15px 0 0;">
<p style="margin:0;font-size:26px;line-height:32px;font-weight:bold;">Setru<span style="color:#FF6B5F;">.</span></p>
<p style="margin:4px 0 0;color:#FFF7F2;font-size:14px;line-height:20px;">Early access</p>
</td></tr>
<tr><td style="padding:24px;color:#0F172A;font-size:16px;line-height:24px;">
<h1 style="margin:0 0 12px;font-size:26px;line-height:32px;">${headline}</h1>
<p style="margin:0 0 16px;">${introduction}</p>
<p style="margin:0 0 16px;padding:12px 14px;background:#FFF0EA;color:#0F172A;border-radius:8px;"><strong>Role submitted:</strong> ${roleLabel}</p>
<p style="margin:0 0 12px;">${status}</p>
<p style="margin:0 0 20px;">${WAITLIST_NEXT_STEP}</p>
<p style="margin:0;">The Setru team</p>
</td></tr>
<tr><td style="padding:16px 24px 20px;border-top:1px solid #E7E3E0;color:#475569;font-size:14px;line-height:22px;">
<p style="margin:0 0 8px;">${help}</p>
<a href="${supportUrl}" style="color:#9F342B;text-decoration:underline;">Setru support</a>
<span aria-hidden="true" style="padding:0 8px;">&middot;</span>
<a href="${privacyUrl}" style="color:#9F342B;text-decoration:underline;">Privacy notice</a>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  return { subject, body, html };
}
