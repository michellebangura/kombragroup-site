// Password gate for every path of kombragroup.com (launch wave 2, 2026-10-30).
// Hard rule: every deploy stays password protected until Michelle's public-launch yes.
// Pattern: /Users/mb/Documents/purposebuiltpress/middleware.ts (SITE_PASSWORD from the Vercel env, no fallback).
//   /hub, /hub/*  -> Vercel env HUB_PASSWORD (mirrors the Mac Keychain item "Kombra hub password"; unchanged)
//   everything else, including /investors-partners -> Vercel env SITE_PASSWORD
// Basic auth; any user name is accepted and the password must match. No cookie is set.
// Fails closed with 503 when the env var for that path is unset. Every gated response carries noindex.
// Opening the site to the public is a one-line change she approves: remove '/:path*' and '/' from the matcher.

export const config = {
  matcher: ['/', '/:path*'],
  runtime: 'nodejs',
};

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function passwordFrom(header) {
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

export function gateFor(pathname) {
  if (pathname === '/hub' || pathname.startsWith('/hub/')) {
    return { env: 'HUB_PASSWORD', realm: 'Kombra hub', unset: 'Hub is not configured.' };
  }
  if (pathname === '/investors-partners' || pathname.startsWith('/investors-partners/')) {
    return { env: 'SITE_PASSWORD', realm: 'Kombra investors and partners', unset: 'Site not open yet.' };
  }
  return { env: 'SITE_PASSWORD', realm: 'Kombra Group preview', unset: 'Site not open yet.' };
}

// Vercel calls middleware(request, context); the env is passed separately so the tests can supply one.
export function check(request, env) {
  const gate = gateFor(new URL(request.url).pathname);
  const expected = env[gate.env];
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

export default function middleware(request) {
  return check(request, process.env);
}
