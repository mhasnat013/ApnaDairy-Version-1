# AGENT 2 — PUBLIC FRONTEND & DESIGN BASELINE AUDIT

**Date:** 2026-09-27 · **Auditor:** Agent 2 (read-only) · **Target:** `~/workspace/apnadairy/frontend` served at `http://127.0.0.1:4173` (dist build, not restarted)
**Design authority:** `~/workspace/apnadairy/PLOY_MASTER_BRIEF.md` (Ploy-inspired)
**Method:** Playwright + Firefox, DOM assertions, screenshots at 390/768/1440px, keyboard-only operation, reduced-motion emulation, source read (no edits).
**Evidence:** `~/workspace/apnadairy/audit/evidence/agent2/`

---

## 1. ROUTE TABLE

All routes return HTTP 200 (SPA serves `index.html`; client router resolves). No page errors on any route. No horizontal overflow at 390px on any route. Global nav present on all public routes. Headings verified against route intent (editorial wording, e.g. `/` → "FRESH MILK SHOULD NEVER BE A GUESS.", `/unauthorized` → "NOT YOUR DOOR", bogus URL → custom 404 "THIS PAGE WANDERED OFF").

| Route | Status | Console errors | Heading OK | Mobile OK (390px, no overflow) |
|---|---|---|---|---|
| `/` | 200 | none | ✅ exact brief copy | ✅ |
| `/how-it-works` | 200 | none | ✅ | ✅ |
| `/freshness-engine` | 200 | none | ✅ | ✅ |
| `/for-farmers` | 200 | none | ✅ | ✅ |
| `/for-customers` | 200 | none | ✅ | ✅ |
| `/for-businesses` | 200 | none | ✅ | ✅ |
| `/for-delivery-riders` | 200 | none | ✅ | ✅ |
| `/farms` | 200 | 2× CORS-blocked `GET http://localhost:8000/api/v1/farms` (backend not running in this env) | ✅ | ✅ |
| `/marketplace` | 200 | 2× CORS-blocked `GET http://localhost:8000/api/v1/products` (same cause) | ✅ | ✅ |
| `/batch-trace` | 200 | none | ✅ | ✅ |
| `/dynamic-pricing` | 200 | none | ✅ | ✅ |
| `/about` | 200 | none | ✅ | ✅ |
| `/support` | 200 | none | ✅ | ✅ |
| `/contact` | 200 | none | ✅ | ✅ |
| `/faq` | 200 | none | ✅ | ✅ |
| `/login` | 200 | none | ✅ | ✅ |
| `/register` | 200 | none | ✅ | ✅ |
| `/forgot-password` | 200 | none | ✅ | ✅ |
| `/reset-password` | 200 | none | ✅ | ✅ (not in task list; verified anyway) |
| `/privacy` | 200 | none | ✅ | ✅ |
| `/terms` | 200 | none | ✅ | ✅ |
| `/unauthorized` | 200 | none | ✅ | ✅ |
| `/farms/1` (dynamic) | 200 | — | ✅ route resolves | ✅ |
| `/products/1` (dynamic) | 200 | — | ✅ route resolves | ✅ |
| `/batch-trace/ABC123` (dynamic) | 200 | — | ✅ route resolves | ✅ |
| `/this-page-does-not-exist-xyz` | 200 (SPA) | none | ✅ custom 404 renders | ✅ |

**CTA destination checks (homepage):** Join the Network → `/register` ✅ · See How It Works → `/how-it-works` ✅ · Freshness Engine card → `/freshness-engine` ✅ · "Explore the Journey" circular button scrolls to `#journey` ✅.

---

## 2. DESIGN vs PLOY BRIEF — COMPARISON

| Brief requirement | Verdict | Evidence |
|---|---|---|
| §5 Floating pill nav (desktop): logo, Product▾, How It Works, For Your Role▾, Freshness Engine, Verified Farms, Marketplace, Support, Login (light pill), Create Account (dark-green pill) | ✅ PASS | `home-1440.png`; all 9 items present, correct pill styling |
| §5 Product dropdown: B2C, B2B, IoT, AI Freshness, Dynamic Pricing, Batch Traceability | ✅ PASS | `nav-dropdown.png`; all 6 with icons + descriptions |
| §5 For Your Role dropdown: Farmers, Customers, Businesses, Delivery Riders | ✅ PASS | `nav-dropdown-role.png`; all 4 |
| §5 Mobile: logo/menu pill left, Create Account right, full menu, Escape, keyboard, ≥44px targets | ✅ PASS | `nav-mobile-menu.png`; all 17 links incl. Login; `overflow-y:auto` scrollable; Escape closes |
| §6 Hero: exact eyebrow/headline/description/CTAs/announcement card copy | ✅ PASS | Screenshots at 3 widths; copy matches brief verbatim |
| §6 Responsive `<picture>`: portrait asset mobile, landscape desktop/tablet | ✅ PASS | 390px shows portrait crop, 768/1440px show landscape; `object-position:72%` keeps specialist's face fully visible on mobile (verified in `home-390.png`) |
| §6 Dark emerald overlay, white text left, preload, no layout shift | ✅ PASS | Overlay gradients in DOM; image preloads; fixed container geometry |
| §6 Entrance ≈1.2s: image 1.04→1, line-by-line heading, staggered CTAs, reduced-motion static end state | ✅ PASS | `home-1440-reduced-motion.png` renders final state under emulated `prefers-reduced-motion` |
| §7 Ecosystem below hero: central APNADAIRY, 4 modules, default B2C selected, illuminated ring | ✅ PASS | `ecosystem-1440.png`; aria `selected` state verified per module |
| §7 Interactions: hover/focus preview, click select, dynamic right visual, description update, keyboard Enter/Space | ✅ PASS | Real-keyboard Enter → IoT selected, Space → AI selected; focus works; panel image+stat card update |
| §8 Popups: title, description, image, 4–6 features, beneficiaries, Explore More, Close, focus trap, Escape, mobile sheet | ✅ PASS | `popup-*.png`; IoT popup shows 5 features + who-benefits + Explore more + close; focus trapped; Escape closes; 390px dialog = 390×776 full-screen sheet |
| §8 Explore More destinations | ✅ PASS | B2C→`/marketplace`, B2B→`/for-businesses`, IoT→`/freshness-engine#iot`, AI→`/freshness-engine#ai` (EXPLORE_TO mapping + button present in every popup) |
| §10 Problem statement "MILK REACHED THE MARKET. TRANSPARENCY DIDN'T." + scroll reveal + Monitor/Predict/Deliver cards | ✅ PASS | Component renders heading, `ScrollRevealSentence`, 3 cards with demo badges ("Simulated IoT reading", "Demonstration prediction", "Demo data") |
| §11 Farm-to-table journey: 5 stages, role tabs, prev/next/pause, progress dots | ✅ PASS (fallback) | `journey-1440.png`; headless Firefox has no WebGL → designed poster fallback renders ("FARM-TO-TABLE JOURNEY", stage card, 4 role tabs, controls). Live WebGL **not verifiable in this environment** |
| §12 Film: `FarmToTableFilmPlaceholder`, 16:9, "APNADAIRY FILM — COMING SOON", NO embedded 1-min mp4 | ✅ PASS | `film-placeholder3.png`; zero `<video>` on homepage; no `*1min*` in `dist/`; zero network requests matching `1min` |
| §4 Typography: condensed display + max 2 families, tight leading | ✅ PASS | Computed: H1 = Archivo Narrow, body = Inter (exactly 2); H1 line-height ≈0.92 of size |
| §4 Palette: emerald/forest/ivory/lime; no purple gradients, neon, cartoon | ✅ PASS | Screenshots; lime `#DDF06A` used as controlled accent only |
| §16 Freshness Engine demo disclaimer | ✅ PASS | "Demonstration prediction" chip + label present (`freshness-engine.png`) |
| §16 Marketplace: no checkout without login | ✅ PASS | CTA is "Sign in to purchase" → login |

---

## 3. MEDIA COMPLIANCE VERDICT — ✅ PASS

Human-visible imagery across the entire public site is limited to **3 assets** (plus hero):

| Asset | Used in | Humans | Clothing | Female? | Alt text |
|---|---|---|---|---|---|
| `apnadairy-hero-desktop.png` / `-mobile.png` | Hero | 1 adult male specialist | Emerald workwear, cap | No | Descriptive, appropriate |
| `public/media/farmer-hero.png` | Ecosystem B2C+B2B visual, popups, ForFarmers, film poster | 2 adult males (farmer + ApnaDairy rep); background workers male | Farmer: shalwar kameez + pakol ✅; Rep: emerald waistcoat ✅ | No | Appropriate (poster instance correctly `alt=""` + `aria-hidden` inside labelled `role="img"`) |
| `public/media/dairy-facility.png` | Ecosystem IoT+AI visual, popups, ForCustomers, FreshnessEngine | None (product still-life) | n/a | No | Appropriate |

- No female figure, silhouette, reflection, or mixed-gender group anywhere.
- No broken image paths (the `naturalWidth:0` readings during the sweep were lazy-load timing artifacts for below-fold images; screenshots confirm all render).
- No duplicate videos shipped; 1-min film correctly **not** embedded.
- 3D journey characters not visually verifiable here (WebGL unavailable headless); no 3D humans observed in poster fallback.

---

## 4. ANIMATION VERDICT — ✅ PROFESSIONAL

- Hero entrance, masked-line reveals, staggered CTAs, card reveals, modal transitions: restrained cubic-bezier easings, cinematic, no bounce.
- Exactly **one** infinite animation in public code: the hero scroll-cue arrow's 5px vertical bob (`1.8s easeInOut`) — subtle, non-blocking, and **disabled under reduced motion** (separate static branch). Acceptable.
- Marquee (honest-labels ticker) is a standard slow CSS scroll, non-blocking.
- **Nothing** childish, cartoon-like, toy-like, bouncy, spinning, flashing, or content-blocking found.
- Reduced motion: emulated `prefers-reduced-motion: reduce` → hero renders in final static state; ecosystem/journey respect `useReducedMotion`.

---

## 5. ISSUE LIST (read-only findings — no fixes applied)

| ID | Pri | Area | Reproduction | Expected | Actual |
|---|---|---|---|---|---|
| A2-01 | P3 | Hero typography | Load `/` at 1440px, inspect "BE A GUESS." | Lime "GUESS." shares the "BE A" baseline | "GUESS." sits ~8–10px below baseline (verified in 2× zoom crop `guess-zoom.png`) |
| A2-02 | P3 | Ecosystem §7 | Select B2C → B2B (or IoT → AI) | Right-side visual changes dynamically | B2C/B2B share `farmer-hero.png`; IoT/AI share `dairy-facility.png` — only the stat card text changes, not the image |
| A2-03 | P2 | Error handling | Open `/farms` or `/marketplace` with API unreachable | Graceful empty/error state, no console noise | 2× CORS errors logged to console per page (`GET http://localhost:8000/api/v1/...` blocked) |
| A2-04 | P3 | Ecosystem §7 mapping | Open B2C module visual | Brief: "male customer, verified dairy products" | Visual shows farmer + ApnaDairy rep (correct for B2B, off-brief for B2C) |
| A2-05 | P3 | Support §16 | Open `/support` | Brief lists "support form" among Support features | No inline form; page routes users to `/contact` form + portal complaints (honest, but literal gap) |
| A2-06 | Info | Journey 3D | Headless environment | Verify live WebGL journey | Not verifiable here — only the designed poster fallback was tested (renders correctly). Needs real-device/GPU check |

No P0 or P1 issues found in the public frontend.

---

## 6. AREA SCORE — **90 / 100**

**Justification (per rubric: file existence ≤25%, untested integration ≤75%):**
- Routes/pages/nav/hero/ecosystem/popups/journey-fallback/film/typography/palette: **implemented and directly tested** by me via browser automation, keyboard operation, and visual inspection → full credit.
- Media compliance: **visually verified** on every human-containing asset → full credit.
- Animations: **verified professional**, reduced-motion confirmed → full credit.
- Deductions: −3 for the hero "GUESS." baseline offset (A2-01) and shared ecosystem visuals (A2-02); −3 because `/farms` and `/marketplace` listing content is backend-integrated but could not be verified against a live API in this environment and they log console errors when the API is down (A2-03, capped per "integrated but untested ≤75%" for those two pages); −2 because live WebGL journey rendering is unverifiable headless (A2-06); −2 for minor brief-literal gaps (A2-04, A2-05).

**Bottom line:** the public frontend is genuinely implemented — not scaffolding. Every route renders, every brief-mandated interaction works (including keyboard and Escape paths), media is compliant, and the design matches the Ploy brief to a professional standard. Remaining items are polish-level except A2-03 (graceful API-failure handling), which is the one functional gap in this area.
