/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No remote image patterns: the only user-supplied image (marshal profile
  // photo) is rendered as a plain <img>, so the image optimizer never fetches
  // third-party hosts.
  async headers() {
    // Baseline security headers. CSP is deliberately absent for now: a
    // meaningful policy needs nonce/hash plumbing for Next's inline runtime
    // scripts — a lax 'unsafe-inline' CSP adds little, a strict one breaks
    // pages. Deferred to a dedicated change.
    // HSTS has no includeSubDomains until every MarshalHQ subdomain is
    // confirmed HTTPS-only; browsers ignore HSTS on plain-HTTP localhost.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
