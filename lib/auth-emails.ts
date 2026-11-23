const supportUrl = "https://setru.co.uk/support";
const privacyUrl = "https://setru.co.uk/privacy";

const authCopy = {
  verification: {
    subject: "Verify your Setru email",
    headline: "Verify your email address",
    intro: "Confirm this email address to verify your Setru account. Pilot shifts are available to invited participants.",
    button: "Verify email address",
    expiry: "This link expires in 24 hours and can only be used once.",
    unexpected: "If you didn’t create a Setru account, you can ignore this email.",
  },
  reset: {
    subject: "Reset your Setru password",
    headline: "Reset your password",
    intro: "Someone asked to reset the password for the Setru account linked to this email. If it was you, use the button below to set a new password.",
    button: "Reset password",
    expiry: "This link expires in 1 hour and can only be used once.",
    unexpected: "If you didn’t request a reset, ignore this email. Your password will stay the same.",
  },
} as const;

type AuthEmailKind = keyof typeof authCopy;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );
}

function renderAuthEmail(kind: AuthEmailKind, actionUrl?: string) {
  const { subject, headline, intro, button, expiry, unexpected } = authCopy[kind];
  const previewNote = "Design preview only. This button does not work.";
  const href = actionUrl === undefined ? undefined : escapeHtml(actionUrl);
  const buttonStyle = "display:inline-block;padding:13px 20px;border-radius:8px;background:#9F342B;color:#FFFFFF;font-size:16px;line-height:22px;font-weight:bold;text-decoration:none;";
  const action = href === undefined
    ? `<span style="${buttonStyle}">${button}</span>`
    : `<a href="${href}" style="${buttonStyle}">${button}</a>`;

  const body = [
    headline,
    intro,
    actionUrl === undefined ? previewNote : actionUrl,
    expiry,
    unexpected,
    "The Setru team",
    `Support: ${supportUrl}\nPrivacy: ${privacyUrl}`,
  ].join("\n\n");

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#FFF7F2;color:#0F172A;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFF7F2">
<tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="560" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="width:100%;max-width:560px;border:1px solid #E7E3E0;border-radius:16px;">
<tr><td align="left" style="padding:24px 24px 20px;background:#0F172A;color:#FFFFFF;border-radius:15px 15px 0 0;">
<p style="margin:0;font-size:26px;line-height:32px;font-weight:bold;">Setru<span style="color:#FF6B5F;">.</span></p>
<p style="margin:4px 0 0;color:#FFF7F2;font-size:14px;line-height:20px;">Account security</p>
</td></tr>
<tr><td align="left" style="padding:24px;color:#0F172A;font-size:16px;line-height:24px;">
<h1 style="margin:0 0 12px;font-size:26px;line-height:32px;">${headline}</h1>
<p style="margin:0 0 20px;">${intro}</p>
<p style="margin:0 0 16px;">${action}</p>
${href === undefined ? `<p style="margin:0 0 16px;color:#475569;font-size:14px;">${previewNote}</p>` : ""}
<p style="margin:0 0 16px;padding:12px 14px;background:#FFF0EA;color:#0F172A;border-radius:8px;">${expiry}</p>
<p style="margin:0 0 20px;">${unexpected}</p>
<p style="margin:0;">The Setru team</p>
</td></tr>
<tr><td align="left" style="padding:16px 24px 20px;border-top:1px solid #E7E3E0;color:#475569;font-size:14px;line-height:22px;">
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

export function verificationEmail(url: string) {
  return renderAuthEmail("verification", url);
}

export function passwordResetEmail(url: string) {
  return renderAuthEmail("reset", url);
}

export function authEmailPreview(kind: AuthEmailKind) {
  return renderAuthEmail(kind);
}
