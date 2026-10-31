// Private gates. The public site is untouched; only the paths in config.matcher are protected.
//   /hub                 -> Vercel env HUB_PASSWORD (mirrors the Mac Keychain item "Kombra hub password").
//   /investors-partners  -> Vercel env SITE_PASSWORD (added 2026-10-30; stays gated until Michelle's public-launch yes).
// Pattern: /Users/mb/Documents/purposebuiltpress/middleware.ts. Any user name is accepted; the password must match.
// Fails closed with 503 when the env var for that path is unset. Every gated response carries a noindex header.

export const config = {
  matcher: ['/hub', '/hub/:path*', '/investors-partners', '/investors-partners/:path*'],
  runtime: 'nodejs',
};

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function passwordFrom(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  let decoded = '';
  try {
    decoded = atob(header.slice('Basic '.length).trim());
  } catch {
    return null;
  }
  const colon = decoded.indexOf(':');
  return colon === -1 ? null : decoded.slice(colon + 1);
}

const PRIVATE_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
};

function gateFor(pathname) {
  if (pathname === '/investors-partners' || pathname.startsWith('/investors-partners/')) {
    return { env: 'SITE_PASSWORD', realm: 'Kombra investors and partners', unset: 'Site not open yet.' };
  }
  return { env: 'HUB_PASSWORD', realm: 'Kombra hub', unset: 'Hub is not configured.' };
}

export default function middleware(request) {
  const gate = gateFor(new URL(request.url).pathname);
  const expected = process.env[gate.env];
  if (!expected) {
    return new Response(gate.unset, { status: 503, headers: PRIVATE_HEADERS });
  }
  const given = passwordFrom(request.headers.get('authorization'));
  if (given !== null && sameText(given, expected)) {
    return; // continue to the static files
  }
  return new Response('Private. Sign in to view.', {
    status: 401,
    headers: {
      ...PRIVATE_HEADERS,
      'WWW-Authenticate': `Basic realm="${gate.realm}", charset="UTF-8"`,
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
