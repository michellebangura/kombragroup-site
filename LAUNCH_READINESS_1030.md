# kombragroup.com launch readiness, 2026-10-30

Checked 2026-10-30 22:31 PDT (Mac clock). Branch `launch/wave2-1030`, worktree `/Users/mb/kombragroup-site-wave2`, head `ba243a6` (deployed build `c23f675`; later commits change only the snapshot and this report, neither of which is served). Not pushed to GitHub; production not touched.

Her words: "It's time to launch we can use placeholder covers." ... "do all of the brands have designs aligned to the parents, part of the same family, different collections?" ... "every website also needs a page for investors and partners". Her standard: "best and strongest choices made and shortcuts never taken".

## Gated preview

https://kombragroup-site-1pz7t0rkz-michelle-banguras-projects.vercel.app

Two locks: Vercel authentication, then our password gate (`middleware.js`, SITE_PASSWORD on the Vercel project, the same password as the other sites, from Credential Manager). The gate covers every path. `/hub` keeps its own HUB_PASSWORD. If the password is missing, the site returns 503 rather than opening.

Every main route was checked with curl against the deployed preview on 2026-10-30. No route opened without the password. The checker is in the scratchpad (`kg_gatecheck.py`) and keeps both secrets in memory only.

| route | no Vercel auth | no password | wrong password | right password | content |
|---|---|---|---|---|---|
| / | 302 | 401 | 401 | 200 | ok |
| /ventures/ | 302 | 401 | 401 | 200 | ok |
| /ventures/purpose-built/ | 302 | 401 | 401 | 200 | ok |
| /ventures/kombracare/ | 302 | 401 | 401 | 200 | ok |
| /ventures/kombra-labs/ | 302 | 401 | 401 | 200 | ok |
| /ventures/kekoro/ | 302 | 401 | 401 | 200 | ok |
| /contact/ | 302 | 401 | 401 | 200 | ok |
| /legal/privacy.html, terms, accessibility, cookies | 302 | 401 | 401 | 200 | ok |
| /blog/, /blog/six-week-diagnostic.html | 302 | 401 | 401 | 200 | ok |
| /assets/site.css, /assets/fonts/fonts.css, /robots.txt | 302 | 401 | 401 | 200 | ok |
| /hub/ with the site password | | | | 401 (correct: the hub has its own password) | |

## Audit and fixes

| area | finding | state |
|---|---|---|
| Build | `node scripts/build.mjs` generates the venture pages from `data/ventures.json` and the family snapshot. `--check` runs in the tests. | ok |
| Tests | `npm test` runs 19 tests and all 19 pass. They cover the gate, links, false claims, statuses, family sync, CSP, contrast, robots and two regressions. | ok |
| Family architecture | Kombra Group > collections (Purpose Built, KombraCare, Kombra Labs, Kekoro) > brands. Each page is built from `/Users/mb/kombra-family-1030/family.json`. Each collection page uses its collection accent. | ok |
| Design tokens vs parent | The family core typefaces (Cormorant Garamond, DM Sans, IBM Plex Mono) are self-hosted. The copper parent accent is in place. Collection text colours pass WCAG AA (test). | ok |
| Family snapshot drift | The family agent added `fontsHref` and `selfHostedFonts` to family.json after the earlier session. The sync test caught the change. | fixed (resynced, rebuilt) |
| Legal pages | Adopted the family branch's newer legal pages, which use self-hosted fonts and the fixed bar layout. The pages are still labelled "Draft for review by Michelle Bangura and counsel". | content is the family agent's; needs her review |
| Data protection | No forms and no analytics. Nothing is collected. Contact is by email (hello@kombragroup.com). No Google Fonts requests remain on any page. The CSP now allows fonts from self only. | fixed (CSP tightened, new test) |
| Security headers | HSTS, nosniff, DENY framing, Referrer-Policy, Permissions-Policy, COOP, CSP with `script-src 'self'`, noindex on every response. robots.txt disallows all. | ok |
| Venture statuses | Checked 2026-10-30. Open: Purpose Built Compliance (live 200), Be The Hero (live 200). Private preview: PBP and NIF (both return 401 publicly, as gated). Soft launch: Be Better at Life. In development: Heritage Vault, KombraCare (hew.app), Kombra Labs, VibeBuilt. Only the open brands link out. | ok |
| False claims removed | Removed "Live Venture" claims for unlaunched brands, a dead heritage-vault-kappa link, private family-tree figures and stack disclosures. A test keeps them out. | ok |
| Broken flows | Every internal link and asset resolves (test). Inline handlers were replaced with an external script. | ok |
| Deploy | The first `vercel deploy` failed with "fetch failed", a transient network error. The retry succeeded. | ok |

## Needs Michelle

1. Say yes to a public launch. Until she does, every path stays behind the password. Opening the site means removing `'/'` and `'/:path*'` from the matcher in `middleware.js`, plus robots.txt and the noindex headers.
2. Approve the legal pages (privacy, terms, accessibility, cookies). They are marked draft for her and counsel.
3. Kekoro collection: `family.json` has no design source or accent for it, so its page uses the neutral house colours. A Kekoro accent is her design call.

## Coordination notes (not done here)

- Another agent works on branch `investors-partners-1030` in `/Users/mb/kombragroup-site`. That branch has the investors and partners hub and narrower middleware and vercel.json. When it merges with this branch, keep this branch's `middleware.js`. It gates every path and already gates `/investors-partners` with SITE_PASSWORD, as the tests show. Merge their vercel.json header blocks too; this branch already includes them.
- A production deploy happened about an hour before this check, and it was not made from this branch. kombragroup.com currently returns a public 200 from that deploy. This branch has not been promoted to production. Promoting it would put the whole site behind the password.
- The hub files in `/Users/mb/kombragroup-site/hub/` (untracked) and the investors-partners pages were not edited.

## Skeptic review addendum (2026-10-30)

- Re-ran `npm test` (19 of 19 pass), the gate check and a byte-for-byte compare of every served file against the branch. Only Vercel's preview feedback script differs. All claims held.
- Found unsourced figures on the homepage, added by the 2026-09-16 relaunch and not in her earlier copy (106f8d2): "40% reduction in maintenance cycle time", "85% reduction in manual verification", "Multi-million dollar licensing savings", "high-frequency trading portals", "automated physical vault fulfillment", and "Michelle Sterling Bangura". Replaced them with her earlier wording and added the strings to the false-claims test (commit 1b10997).
- New gated preview: https://kombragroup-site-z8x5nu2w7-michelle-banguras-projects.vercel.app (gate check ALL PASS).
- Still for her: the homepage keeps the other figures and client names that were in her own April and August copy ($500M+, 100% shortlist rate, 69:1 ROI, $40M and 400,000+ residents, 50%/30%/35%/25% results, the client list, SAM.gov registration and the phone number). They come from her copy, but they need her confirmation before a public launch.
