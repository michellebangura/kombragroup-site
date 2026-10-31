// Builds the Kombra Group venture collection pages from data/ventures.json and writes the
// generated venture blocks into index.html between <!-- gen:NAME:start --> / <!-- gen:NAME:end --> markers.
// Run: node scripts/build.mjs        (writes files)
//      node scripts/build.mjs --check (exits 1 if any file would change; used by the tests)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const FAMILY_LIVE = '/Users/mb/kombra-family-1030/family.json';
if (process.argv.includes('--sync')) {
  writeFileSync(join(root, 'data/family.snapshot.json'), readFileSync(FAMILY_LIVE, 'utf8'));
  console.log('synced data/family.snapshot.json from', FAMILY_LIVE);
}
const raw = JSON.parse(readFileSync(join(root, 'data/ventures.json'), 'utf8'));
const family = JSON.parse(readFileSync(join(root, 'data/family.snapshot.json'), 'utf8'));
const NEUTRAL = { accent: '#6E737B', accentText: '#4A5058' }; // a collection with no accent yet (design pending)

// Collections in display order, with name/audience/accent and brand membership from family.json.
export const data = {
  ...raw,
  collections: raw.collectionOrder.map((id) => {
    const f = family.collections[id];
    if (!f) throw new Error(`collection ${id} is not in family.json`);
    const extra = raw.collections[id];
    const memberIds = Object.entries(family.brands).filter(([, b]) => b.collection === id && !b.flags?.parent).map(([bid]) => bid);
    const brands = memberIds.map((bid) => {
      if (!raw.brands[bid]) throw new Error(`brand ${bid} has no status/description in data/ventures.json`);
      return { id: bid, name: family.brands[bid].name, ...raw.brands[bid] };
    });
    return {
      id, name: f.name, audience: f.audience,
      accent: f.accent || NEUTRAL.accent, accentText: f.accentText || NEUTRAL.accentText, designPending: !f.accent,
      short: extra.short, summary: extra.summary, status: extra.status || null, brands,
    };
  }),
};
for (const bid of Object.keys(family.brands)) {
  if (family.brands[bid].flags?.parent) continue;
  if (!raw.collectionOrder.includes(family.brands[bid].collection)) throw new Error(`brand ${bid} is in a collection that is not shown`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const brands = data.collections.flatMap((c) => c.brands.map((b) => ({ ...b, collection: c })));
const label = (s) => data.statusLabels[s];

export const familyBar = `<!-- Kombra Group family bar (source: /Users/mb/kombra-family-1030) -->
<div class="kf-bar" style="--kf-bg:#0B1322;--kf-fg:#FBF9F5;--kf-muted:rgba(251,249,245,0.68);--kf-accent:#C67D3A;--kf-rule:rgba(251,249,245,0.14)">
  <div class="kf-inner">
    <a class="kf-mark" href="/" aria-label="Kombra Group home">kombra<span>group</span></a>
    <span class="kf-line">The Kombra Group family of companies</span>
    <nav class="kf-links" aria-label="Legal">
      <a href="/legal/privacy.html">Privacy</a><a href="/legal/terms.html">Terms</a><a href="/legal/accessibility.html">Accessibility</a><a href="/legal/cookies.html">Cookies</a><a href="/contact/">Contact</a>
    </nav>
  </div>
</div>`;

function shell({ title, description, path, current, body }) {
  const nav = [
    ['/', 'Home'],
    ['/ventures/', 'Ventures'],
    ['/#services', 'Advisory'],
    ['/#about', 'About'],
    ['/contact/', 'Contact'],
  ]
    .map(([href, text]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${text}</a>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="https://kombragroup.com${path}">
<link rel="preload" href="/assets/fonts/DMSans-variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/fonts/fonts.css">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap">
<a class="mark" href="/" aria-label="Kombra Group home">kombra<span>group</span></a>
<nav aria-label="Main">${nav}</nav>
</div></header>
<main id="main">
${body}
</main>
<footer class="site-foot"><div class="wrap">Status checked ${esc(data.checked)}. Questions: <a href="mailto:${esc(data.parent.email)}">${esc(data.parent.email)}</a>.</div></footer>
${familyBar}
</body>
</html>
`;
}

function brandCard(b, level = 'h3') {
  const link =
    b.status === 'open' && b.domain
      ? `<a class="go" href="https://${esc(b.domain)}" rel="noopener noreferrer">Visit ${esc(b.name)}<span class="visually-hidden"> (opens ${esc(b.domain)})</span> &rarr;</a>`
      : '';
  const dom = b.domain ? `<p class="dom">${esc(b.domain)}</p>` : '';
  return `<li class="brand" data-brand="${esc(b.id)}" data-status="${esc(b.status)}">
<span class="status status-${esc(b.status)}">${esc(label(b.status))}</span>
<${level}>${esc(b.name)}</${level}>
${dom}<p>${esc(b.description)}</p>
${link}</li>`;
}

function collectionBlock(c, { heading = 'h2', link = true } = {}) {
  const more = link ? `<p><a class="back" href="/ventures/${esc(c.id)}/">${esc(c.name)} &rarr;</a></p>` : '';
  return `<article class="collection" id="${esc(c.id)}" style="--accent:${esc(c.accent)};--accent-text:${esc(c.accentText)}">
<header><${heading}>${esc(c.name)}</${heading}><span class="aud">${esc(c.audience)}</span></header>
<p>${esc(c.summary)}</p>
${c.status ? `<p><span class="status status-${esc(c.status)}">${esc(label(c.status))}</span></p>` : ''}
${c.brands.length ? `<ul class="brands">
${c.brands.map((b) => brandCard(b, heading === 'h2' ? 'h3' : 'h4')).join('\n')}
</ul>` : ''}
${more}</article>`;
}

function tree() {
  return `<div class="tree" aria-label="How the family is organised">
<span class="lvl">Parent</span><strong>${esc(family.collections['kombra-group'].name)}</strong>
<ol>
${data.collections
  .map(
    (c) =>
      `<li><span class="lvl">Collection</span><a href="/ventures/${esc(c.id)}/">${esc(c.name)}</a>
${c.brands.length ? `<ol>${c.brands.map((b) => `<li><span class="lvl">Brand</span>${esc(b.name)} <span class="note">(${esc(label(b.status))})</span></li>`).join('')}</ol>` : (c.status ? ` <span class="note">(${esc(label(c.status))})</span>` : '')}</li>`
  )
  .join('\n')}
</ol>
</div>`;
}

const legend = `<p class="note">How to read the status: <strong>Open</strong> means anyone can visit the site today. <strong>Private preview</strong> means the site is built and behind a password until launch. <strong>Soft launch</strong> means it is shared with a small group first. <strong>In development</strong> means it is being built. Checked ${esc(data.checked)}.</p>`;

const files = {};

files['ventures/index.html'] = shell({
  title: 'Ventures | Kombra Group',
  description: `The Kombra Group family: ${data.collections.length} collections and ${brands.length} brands, with the current status of each.`,
  path: '/ventures/',
  current: '/ventures/',
  body: `<section class="hero"><div class="wrap">
<p class="eyebrow">The Kombra Group family</p>
<h1>One parent. ${data.collections.length} collections. ${brands.length} brands.</h1>
<p>Kombra Group is the parent company. Each brand belongs to one collection, and each collection shares a look and a set of privacy rules with the parent.</p>
</div></section>
<section><div class="wrap">
<h2>How the family fits together</h2>
${tree()}
${legend}
</div></section>
<section style="padding-top:0"><div class="wrap">
${data.collections.map((c) => collectionBlock(c)).join('\n')}
</div></section>`,
});

for (const c of data.collections) {
  files[`ventures/${c.id}/index.html`] = shell({
    title: `${c.name} | Kombra Group`,
    description: `${c.name}: ${c.summary}`,
    path: `/ventures/${c.id}/`,
    current: '/ventures/',
    body: `<section class="hero" style="border-bottom:4px solid ${esc(c.accent)}"><div class="wrap">
<p class="eyebrow">Kombra Group &rsaquo; Collection</p>
<h1>${esc(c.name)}</h1>
<p>${esc(c.summary)} For: ${esc(c.audience)}.</p>
</div></section>
<section><div class="wrap">
${collectionBlock(c, { link: false })}
${legend}
<p><a class="back" href="/ventures/">&larr; All collections</a></p>
</div></section>`,
  });
}

// Contact. Channels come from the homepage contact section (Michelle's own copy) and
// family.json brand emails. No form: nothing is collected or stored by this site.
const brandEmails = [
  ['Purpose Built Press and Name It First', 'hello@purposebuiltpress.com'],
  ['Purpose Built Compliance', 'compliance@purposebuiltcompliance.com'],
];
files['contact/index.html'] = shell({
  title: 'Contact | Kombra Group',
  description: 'How to reach Kombra Group and the brands in the Kombra Group family.',
  path: '/contact/',
  current: '/contact/',
  body: `<section class="hero"><div class="wrap">
<p class="eyebrow">Contact</p>
<h1>Tell us what needs to be solved.</h1>
<p>Email is the fastest way to reach us. Write to us about advisory work, a venture, a partnership or a question about your information.</p>
</div></section>
<section><div class="wrap">
<h2>Kombra Group</h2>
<div class="cards">
<div class="card"><span class="label">Email</span><a href="mailto:${esc(data.parent.email)}">${esc(data.parent.email)}</a></div>
<div class="card"><span class="label">Telephone</span><a href="tel:+14152269566">+1 415-226-9566</a></div>
<div class="card"><span class="label">Founder</span><a href="https://michellebglobal.com" rel="noopener noreferrer">michellebglobal.com</a></div>
<div class="card"><span class="label">LinkedIn</span><a href="https://linkedin.com/in/michellebangura" rel="noopener noreferrer">linkedin.com/in/michellebangura</a></div>
</div>
</div></section>
<section style="padding-top:0"><div class="wrap">
<h2>Brands with their own inbox</h2>
<p class="lead">Every other brand in the family answers at ${esc(data.parent.email)}.</p>
<div class="cards">
${brandEmails.map(([n, e]) => `<div class="card"><span class="label">${esc(n)}</span><a href="mailto:${esc(e)}">${esc(e)}</a></div>`).join('\n')}
</div>
</div></section>
<section style="padding-top:0"><div class="wrap">
<h2>Your information</h2>
<p class="lead">This site has no forms and sets no tracking cookies. To see, correct or delete information you have sent us, email ${esc(data.parent.email)}. Read the <a href="/legal/privacy.html">privacy policy</a>.</p>
</div></section>`,
});

// Blocks inside index.html
const count = `${brands.length} brands in ${data.collections.length} collections`;
const blocks = {
  'hero-stat': `<div class="stat-item">
          <div class="stat-val">${brands.length}</div>
          <div class="stat-lbl">Brands in ${data.collections.length} Collections</div>
        </div>`,
  'home-collections': `<div class="venture-grid">
${data.collections
  .map(
    (c) => `        <div class="venture-card" style="border-top:4px solid ${esc(c.accent)}">
          <div>
            <div class="venture-header"><span class="venture-badge">Collection</span></div>
            <h3>${esc(c.name)}</h3>
            <p class="subtitle">${esc(c.audience)}</p>
            <p class="desc">${esc(c.summary)}</p>
            <ul class="venture-meta">
${(c.brands.length ? c.brands.map((b) => `              <li><strong>${esc(b.name)}</strong> &bull; ${esc(label(b.status))}</li>`) : [`              <li>${esc(label(c.status))}</li>`]).join('\n')}
            </ul>
          </div>
          <a href="/ventures/${esc(c.id)}/" class="venture-link">${esc(c.short)} collection &rarr;</a>
        </div>`
  )
  .join('\n')}
      </div>`,
  'ventures-list': `<div class="venture-grid">
${brands
  .map((b) => {
    const link =
      b.status === 'open' && b.domain
        ? `<a href="https://${esc(b.domain)}" rel="noopener noreferrer" class="venture-link">Visit ${esc(b.name)} &rarr;</a>`
        : `<a href="/ventures/${esc(b.collection.id)}/" class="venture-link">${esc(b.collection.short)} collection &rarr;</a>`;
    return `        <div class="venture-card" data-brand="${esc(b.id)}" data-status="${esc(b.status)}">
          <div>
            <div class="venture-header"><span class="venture-badge">${esc(label(b.status))}</span><span class="venture-coll">${esc(b.collection.short)}</span></div>
            <h3>${esc(b.name)}</h3>
            ${b.domain ? `<p class="subtitle">${esc(b.domain)}</p>` : ''}
            <p class="desc">${esc(b.description)}</p>
          </div>
          ${link}
        </div>`;
  })
  .join('\n')}
      </div>`,
  'family-pillars': [
    ...data.collections.map(
      (c, i) => `          <div class="thesis-pillar">
            <h4>${i + 1}. ${esc(c.name)}</h4>
            <p>${esc(c.summary)}</p>
          </div>`
    ),
    `          <div class="thesis-pillar">
            <h4>${data.collections.length + 1}. One standard</h4>
            <p>One design core and one set of privacy rules across every Kombra Group brand, led by ${esc(family.collections['kombra-group'].name)}.</p>
          </div>`,
  ].join('\n'),
  'about-ventures': `<p>
            Today Kombra Group is the parent of ${count}: ${data.collections.map((c) => esc(c.name)).join(', ').replace(/, ([^,]*)$/, ' and $1')}. <a href="/ventures/">See every brand and its current status</a>.
          </p>`,
  'footer-ventures': `<h5>Collections</h5>
      <ul>
${data.collections.map((c) => `        <li><a href="/ventures/${esc(c.id)}/">${esc(c.name)}</a></li>`).join('\n')}
        <li><a href="/ventures/">All ventures</a></li>
      </ul>`,
};

const indexPath = join(root, 'index.html');
let index = readFileSync(indexPath, 'utf8');
for (const [name, html] of Object.entries(blocks)) {
  const re = new RegExp(`(<!-- gen:${name}:start -->)[\\s\\S]*?(<!-- gen:${name}:end -->)`);
  if (!re.test(index)) throw new Error(`index.html is missing the gen:${name} markers`);
  index = index.replace(re, `$1\n${html}\n$2`);
}
files['index.html'] = index;

let changed = [];
for (const [rel, content] of Object.entries(files)) {
  const p = join(root, rel);
  const old = existsSync(p) ? readFileSync(p, 'utf8') : null;
  if (old !== content) {
    changed.push(rel);
    if (!check) {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content);
    }
  }
}
if (check && changed.length) {
  console.error('Out of date (run node scripts/build.mjs):', changed.join(', '));
  process.exit(1);
}
console.log(check ? 'build check: up to date' : `wrote ${changed.length} file(s): ${changed.join(', ') || 'none'}`);
