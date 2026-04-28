// Safe post-auth redirect handling.
//
// The login form and the post-signup flow accept a `next` query param so a
// user who lands on a protected page while logged out can be sent back to it
// after authenticating. Without validation this is a well-known open-redirect
// vector: an attacker-crafted `?next=https://evil.example` or `?next=//evil`
// would send the user outside MarshalHQ with a trusted-looking origin flash.
//
// Only same-origin absolute paths are accepted. Anything else is normalised
// to the caller-supplied fallback.

const SAFE_PATH = /^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#[\]]*$/;

/**
 * Return `next` if it is a safe internal path, otherwise `fallback`.
 *
 * Rules:
 *   - Must begin with a single `/`
 *   - Must not begin with `//` (protocol-relative redirect)
 *   - Must not begin with `/\` (IE-era malformed redirect)
 *   - Must not contain a scheme (rejected by regex — `:` is only allowed in
 *     the path/query, and the leading-slash gate prevents an initial scheme)
 *   - Must not attempt to encode a protocol via `%2F%2F` or similar
 */
export function safeNextPath(next: unknown, fallback: string): string {
  if (typeof next !== "string" || next.length === 0) return fallback;
  if (next[0] !== "/") return fallback;
  if (next.length >= 2 && (next[1] === "/" || next[1] === "\\")) return fallback;
  // Reject anything that decodes to a protocol-relative or absolute URL.
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (decoded[0] !== "/") return fallback;
  if (decoded.length >= 2 && (decoded[1] === "/" || decoded[1] === "\\")) {
    return fallback;
  }
  if (!SAFE_PATH.test(next)) return fallback;
  return next;
}
