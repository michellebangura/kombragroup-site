// Launch-readiness tests for kombragroup.com. Run: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import middleware, { check, config, gateFor } from '../middleware.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const data = JSON.parse(read('data/ventures.json'));
const family = JSON.parse(read('data/family.snapshot.json'));
const brands = Object.entries(data.brands).map(([id, b]) => ({ id, ...b }));

function htmlFiles(dir = '') {
  const out = [];
  for (const name of readdirSync(join(root, dir))) {
    if (['.git', 'node_modules', 'tests', 'scripts', 'hub', 'investors-partners'].includes(name)) continue;
    const rel = dir ? `${dir}/${name}` : name;
    if (statSync(join(root, rel)).isDirectory()) out.push(...htmlFiles(rel));
    else if (rel.endsWith('.html')) out.push(rel);
  }
  return out;
}
const pages = htmlFiles();
// Pages this branch owns. legal/* belongs to the family agent (branch kombra/family-1030).
const ownPages = pages.filter((p) => !p.startsWith('legal/'));
const basic = (pw) => 'Basic ' + Buffer.from('anyone:' + pw).toString('base64');
const req = (path, auth) => new Request('https://example.test' + path, { headers: auth ? { authorization: auth } : {} });

test('generated pages are in sync with data/ventures.json', () => {
  execFileSync(process.execPath, [join(root, 'scripts/build.mjs'), '--check'], { stdio: 'pipe' });
});

test('gate: matcher covers the root and every path', () => {
  assert.ok(config.matcher.includes('/'));
  assert.ok(config.matcher.includes('/:path*'));
});

test('gate: fails closed with 503 when SITE_PASSWORD is unset', () => {
  const r = check(req('/'), {});
  assert.equal(r.status, 503);
  assert.match(r.headers.get('x-robots-tag'), /noindex/);
});

test('gate: refuses no auth and a wrong password on every main route', () => {
  const env = { SITE_PASSWORD: 'right-one', HUB_PASSWORD: 'hub-one' };
  for (const p of ['/', '/ventures/', '/ventures/purpose-built/', '/contact/', '/legal/privacy.html', '/blog/', '/assets/site.css', '/investors-partners']) {
    const none = check(req(p), env);
    assert.equal(none.status, 401, p);
    assert.match(none.headers.get('www-authenticate'), /^Basic realm=/);
    assert.equal(check(req(p, basic('wrong')), env).status, 401, p);
    assert.equal(check(req(p, 'Basic !!notbase64'), env).status, 401, p);
    assert.equal(check(req(p, basic('right-one')), env), undefined, p);
  }
});

test('gate: /hub keeps its own password', () => {
  const env = { SITE_PASSWORD: 'site', HUB_PASSWORD: 'hub' };
  assert.equal(gateFor('/hub/x').env, 'HUB_PASSWORD');
  assert.equal(check(req('/hub/', basic('site')), env).status, 401);
  assert.equal(check(req('/hub/', basic('hub')), env), undefined);
});

test('gate: default export reads process.env, not the Vercel context argument', () => {
  const saved = process.env.SITE_PASSWORD;
  process.env.SITE_PASSWORD = 'from-env';
  try {
    assert.equal(middleware(req('/', basic('from-env')), { waitUntil() {} }), undefined);
    assert.equal(middleware(req('/'), { waitUntil() {} }).status, 401);
  } finally {
    if (saved === undefined) delete process.env.SITE_PASSWORD;
    else process.env.SITE_PASSWORD = saved;
  }
});

test('every internal link and asset resolves to a file in the deploy', () => {
  const missing = [];
  for (const p of pages) {
    const html = read(p);
    for (const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
      let t = m[1];
      if (t.startsWith('/hub') || t.startsWith('/investors-partners')) continue; // other agent's hub
      t = t.replace(/^\//, '');
      const candidates = t === '' ? ['index.html'] : [t, `${t}/index.html`, t.replace(/\/$/, '') + '/index.html'];
      if (!candidates.some((c) => existsSync(join(root, c)) && statSync(join(root, c)).isFile())) missing.push(`${p} -> ${m[1]}`);
    }
    for (const m of html.matchAll(/url\((\/[^)]+)\)/g)) if (!existsSync(join(root, m[1]))) missing.push(`${p} -> ${m[1]}`);
  }
  for (const m of read('assets/fonts/fonts.css').matchAll(/url\((\/[^)]+)\)/g)) if (!existsSync(join(root, m[1]))) missing.push(`fonts.css -> ${m[1]}`);
  assert.deepEqual(missing, []);
});

test('every page carries the family bar legal links and noindex', () => {
  for (const p of pages) {
    const html = read(p);
    for (const l of ['/legal/privacy.html', '/legal/terms.html', '/legal/accessibility.html', '/legal/cookies.html']) assert.ok(html.includes(l), `${p} lacks ${l}`);
    assert.match(html, /name="robots" content="noindex/, `${p} lacks noindex`);
  }
});

test('no false or private claims on any page this branch owns', () => {
  const banned = [
    /Live Venture/i, /Live Ventures/i, /Four Live/i, /Eight Category/i, /heritage-vault-kappa/, /imjustzain/i, /Koroma/i,
    /180\+ people/, /61 families/, /1,200\+/, /Supabase/, /Next\.js 16/, /\b4\b<\/div>\s*<div class="stat-lbl">Live/,
  ];
  for (const p of ownPages) for (const re of banned) assert.doesNotMatch(read(p), re, `${p} matches ${re}`);
});

test('status rules: only open brands link out, and every brand appears with its status', () => {
  const v = read('ventures/index.html');
  for (const b of brands) {
    const card = v.match(new RegExp(`<li class="brand" data-brand="${b.id}"[\\s\\S]*?</li>`));
    assert.ok(card, `missing card for ${b.id}`);
    assert.ok(card[0].includes(data.statusLabels[b.status]), `${b.id} status label`);
    const linksOut = /href="https:\/\//.test(card[0]);
    assert.equal(linksOut, b.status === 'open', `${b.id} outbound link vs status ${b.status}`);
    if (b.status === 'open') assert.ok(b.domain, `${b.id} open without domain`);
  }
  const idx = read('index.html');
  for (const b of brands) {
    const card = idx.match(new RegExp(`<div class="venture-card" data-brand="${b.id}"[\\s\\S]*?venture-link`));
    assert.ok(card, `homepage missing ${b.id}`);
  }
});

const familyPath = '/Users/mb/kombra-family-1030/family.json';
test('family snapshot matches the live family design core', { skip: !existsSync(familyPath) && 'no data: family.json not on this machine' }, () => {
  assert.equal(read('data/family.snapshot.json'), readFileSync(familyPath, 'utf8'), 'family.json changed: run node scripts/build.mjs --sync, then rebuild');
});

test('every family brand and collection is shown, in its family.json collection', () => {
  for (const [id, b] of Object.entries(family.brands)) {
    if (b.flags?.parent) continue;
    assert.ok(data.brands[id], `family brand ${id} has no status in data/ventures.json`);
    assert.ok(data.collectionOrder.includes(b.collection), `${id}'s collection ${b.collection} not shown`);
    const page = read(`ventures/${b.collection}/index.html`);
    assert.ok(page.includes(`data-brand="${id}"`), `${id} missing from its collection page`);
  }
  for (const id of Object.keys(family.collections)) {
    if (id === 'kombra-group') continue; // the parent house heads the tree
    assert.ok(data.collectionOrder.includes(id), `collection ${id} not shown`);
    assert.ok(read('ventures/index.html').includes(family.collections[id].name), `${id} name missing`);
  }
  const idx = read('index.html');
  assert.ok(idx.includes("--font-display:'Cormorant Garamond'"));
  assert.ok(idx.includes("--font-body:'DM Sans'"));
  assert.ok(idx.includes("--font-mono:'IBM Plex Mono'"));
  for (const [k, c] of Object.entries(family.collections)) if (c.accent && data.collectionOrder.includes(k)) assert.ok(read(`ventures/${k}/index.html`).includes(c.accent), `${k} accent`);
});

test('fonts are self-hosted on pages this branch owns (no third-party requests)', () => {
  for (const p of ownPages) {
    const html = read(p);
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic/, p);
    assert.ok(html.includes('/assets/fonts/fonts.css'), `${p} lacks fonts.css`);
  }
});

test('CSP-safe: no inline scripts or inline event handlers on pages this branch owns', () => {
  for (const p of ownPages) {
    const html = read(p);
    assert.doesNotMatch(html, /\son[a-z]+="/i, `${p} has an inline handler`);
    assert.doesNotMatch(html, /javascript:/i, p);
    for (const m of html.matchAll(/<script([^>]*)>/g)) assert.match(m[1], /src="/, `${p} has an inline <script>`);
  }
  const csp = JSON.parse(read('vercel.json')).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  assert.match(csp, /script-src 'self';/);
  assert.match(csp, /frame-ancestors 'none'/);
});

function lum(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

test('status badges and collection text colours meet WCAG AA 4.5:1', () => {
  const css = read('assets/site.css');
  for (const m of css.matchAll(/\.status-[a-z-]+\{color:(#[0-9A-Fa-f]{6});background:(#[0-9A-Fa-f]{6})\}/g)) assert.ok(ratio(m[1], m[2]) >= 4.5, `${m[0]} ${ratio(m[1], m[2]).toFixed(2)}`);
  for (const id of data.collectionOrder) { const t = family.collections[id].accentText || '#4A5058'; assert.ok(ratio(t, '#FFFFFF') >= 4.5, `${id} accentText on white`); }
});

test('robots.txt blocks crawling while the site is in preview', () => {
  assert.match(read('robots.txt'), /Disallow: \/\s*$/m);
});

test('regression: the family bar <nav> is not caught by the fixed main-nav rule', () => {
  // A bare `nav{position:fixed}` rule pinned the legal links over the main nav (found 2026-10-30).
  for (const p of ownPages) assert.doesNotMatch(read(p), /(^|[\s}])nav\s*\{[^}]*position:\s*fixed/m, p);
});

test('regression: no trailingSlash rewrite, so /dir/ links are served without a pre-gate redirect', () => {
  // trailingSlash:false sent 308 for /ventures/x/ before the password gate ran (found 2026-10-30).
  assert.equal(JSON.parse(read('vercel.json')).trailingSlash, undefined);
});

test('no page, legal pages included, requests Google Fonts; the CSP allows fonts from self only', () => {
  // Family branch moved legal/* to self-hosted fonts (2026-10-30), so the CSP no longer needs Google hosts.
  for (const p of pages) assert.doesNotMatch(read(p), /fonts\.googleapis|fonts\.gstatic/, p);
  const csp = JSON.parse(read('vercel.json')).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  assert.doesNotMatch(csp, /googleapis|gstatic/);
  assert.match(csp, /font-src 'self';/);
});
