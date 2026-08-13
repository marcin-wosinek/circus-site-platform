# Design — Lamutable (La Mutable)

Locked design system for the lamutable.es WordPress theme. `lamutable/theme.json`
is the canonical source of truth (WordPress reads it directly); this file is
the narrative companion — genre, macrostructure, and rationale that raw JSON
doesn't carry. Future design work reads this first; templates and patterns
defer to it. Amend intentionally — the file is the rule.

Return to the [documentation index](README.md). Localized pattern structure is
documented separately in
[LANGUAGE-PATTERNS.md](lamutable/LANGUAGE-PATTERNS.md).

## System
- Genre · playful (Valencia movement/circus/dance mutual-support association)
- Macrostructure · Ecosystem Index (front page)
- Theme · custom (vibe: "sun-warmed sand, playful movement, communal ease")
- Axes · light / geometric-sans / warm

## Tokens

[`lamutable/theme.json`](lamutable/theme.json) is the only canonical list of
token names and values. The system uses warm paper and ink neutrals, a
terracotta accent, Bricolage Grotesque for display text, Geist for body text,
a modular type scale, and a named spacing scale.

Do not copy token values into documentation or patterns. Reference presets by
name. If a required preset does not exist, add it to `theme.json` first and
document only the design rationale here.

## CTA voice
- Primary · `core/button` default — filled accent background, ink text, pill
  radius (999px), `sm`/`lg` padding rhythm, weight 600 on the display face.
  Hover inverts to ink background / paper text.
- Secondary · `core/button` "Outline" variation — transparent background,
  1.5px solid ink border, same pill radius.
- Focus ring · `focus` accent color, 2px solid, 3px offset — never animated in.

## Typography voice
- Headings: Bricolage Grotesque, weight 700, tracking -0.02em, tight
  line-height (1.08) — geometric-sans, matches the "playful movement" axis.
- Body: Geist, base line-height 1.6.
- Links: accent color, underlined, ink on hover/focus.

## Header (template part · locked 2026-07-25)
- Nav archetype · N7 brutal slab, softened for the playful genre: full-width
  bar, 2px solid ink border-bottom, no shadow / blur / rounded slab corners.
  The only curve in the header is the CTA pill (locked CTA voice).
- Logo · `lamutable/assets/images/logo.png` — the stacked LA/MUTA/-BLE
  wordmark, re-cut from the brand JPG as a transparent PNG in ink
  (`oklch(20% 0.015 40)`) so it sits directly on any paper tone. 5.5rem tall
  on desktop, 4rem ≤ 781px. Links home.
- Nav voice · Bricolage Grotesque 600, `sm`, uppercase, 0.08em tracking
  (set in `theme.json` → `styles.blocks.core/navigation`). Spanish header:
  Quiénes somos · Proyectos · Eventos; "Contacto" is the filled-pill CTA.
  The separate English header uses About us · Projects · Events with
  "Contact" as its CTA, and its logo links to `/en/` (added 2026-08-13).
- States · hover/focus/current = accent underline (0.14em thick, 0.4em
  offset); active = accent text; focus ring = 2px `focus`, 3px offset.
- Mobile · core/navigation overlay menu (paper background, ink text) below
  600px; slab border carried onto the open overlay's edge.
- Files · Spanish pattern `lamutable/patterns/header.php` →
  `lamutable/parts/header.html`; English pattern
  `lamutable/patterns/header-en.php` → `lamutable/parts/header-en.html`;
  slab CSS in `lamutable/style.css` § Header slab.
  See [LANGUAGE-PATTERNS.md](lamutable/LANGUAGE-PATTERNS.md) for the convention
  used by all localized patterns.
- Fonts now self-hosted: latin-subset variable woff2 for both families in
  `lamutable/assets/fonts/`, registered via `fontFace` in `theme.json` —
  no Google Fonts request at runtime.

## Footer (template part · locked 2026-07-26)
- Footer archetype · Ft5 statement (playful cluster). Ft8 marquee was the
  genre default but needs animation — rejected under the locked motion
  stance; Ft3 columns rejected (3 links is not a sitemap).
- Slab · 2px solid ink border-top, mirroring the header slab — the page
  opens and closes with the same rule. No shadow / blur / rounding.
- Statement · "Movimiento en común." — one closing display sentence
  (Bricolage 700, `2xl` fluid, -0.02em, lh 1.08, max 28ch). Copy derived
  from the association's own description, not invented.
- Meta row · hairline (1px `rule`) above; "Asociación La Mutable" wordmark
  left (Bricolage 600, `sm`), nav links right: Quiénes somos ·
  Colaboraciones · Contacto. Links inherit the locked nav voice
  (theme.json core/navigation) and the header's accent-underline states,
  now shared via `.site-header, .site-footer` selectors in style.css.
- Legal · `© {year} Asociación La Mutable · Valencia`, muted `xs`; year is
  dynamic (`date_i18n`) in the pattern.
- Mobile · meta row wraps to a stack; links stay single-line (nowrap per
  item, wrap between items). Verified 320/375/1280, no horizontal scroll.
- Files · pattern `lamutable/patterns/footer.php` (dynamic URLs, i18n) →
  `parts/footer.html`; slab CSS in `lamutable/style.css` § Footer slab.
- Note · preset CSS vars kebab-case digit slugs: `2xl` → 
  `--wp--preset--font-size--2-xl`, `2xs` → `--wp--preset--spacing--2-xs`.
  Two wrong references (theme.json h2, style.css nav padding) were fixed
  2026-07-26; always use the kebab form in hand-written CSS.

## Main region · color journey (locked 2026-07-26)
- The `<main>` background moves; the chrome doesn't. Header and footer stay
  on base `paper` — the 2px ink slabs frame the journey, they never join it.
- Per-page sequence (bands are `core/group` blocks with preset backgrounds):
  `paper` hero → `paper-2` → `accent-tint` wash → `ink` inversion → `paper`
  before the footer slab. Shorter pages drop rungs but keep the order —
  never jump straight from `paper` to `ink` without a warmer step between.
- Limits · max one `accent-tint` band and one `ink` inversion per page.
  The inversion is the statement/CTA moment: `paper` text on `ink` carries
  the ≈13:1 contrast; `accent` on `ink` is for large display type and
  decoration only, never body copy.
- Gradients · only the two named presets (`hero-wash`, `warm-wash`), used as
  band entries — not stacked, not layered, no new gradients without adding
  a preset first. Static CSS; no animated or scroll-driven color (locked
  motion stance).
- Rule-weight hierarchy · inside `<main>`, dividers are hairlines only
  (1px `rule` / `rule-2`). The 2px ink weight belongs to the chrome slabs
  exclusively.

## Front page
- Content is managed on the page assigned as the static homepage; there is no
  theme-owned homepage pattern.
- `lamutable/templates/front-page.html` provides the shared header and footer
  and renders the page's post content inside `<main>`.

## Fair event document (locked 2026-08-05)
- Template · `single-fair_event.html`, selected by WordPress only for the
  `fair_event` post type (whose public rewrite base is `/fair-events/`); other
  posts retain their existing template.
- Structure · shared header → paper document (title, optional 3:2 featured
  image, post content) → shared footer. The reusable document layout lives in
  `patterns/single-fair-event.php`; the template stays thin.
- Metadata · no author/byline. Fair-event documents speak for La Mutable,
  rather than presenting the WordPress account that entered the content.
- Tokens · existing `paper` and spacing presets only; no new visual token or
  CSS rule was introduced.

## Motion stance
- None yet. Static block theme, no build step, no JS animation layer.
- If motion is introduced later, keep it CSS-only (`transform`/`opacity`),
  respect `prefers-reduced-motion`, and record the decision here.

## Exports
`lamutable/theme.json` **is** the export — WordPress block themes consume it
natively (`settings.color.palette`, `settings.typography.fontFamilies` /
`fontSizes`, `settings.spacing.spacingSizes`). No `tokens.css` / Tailwind /
DTCG export is needed unless a non-WordPress consumer of this brand system
shows up later.

## Notes
- No designer on the team — the enforced implementation rules are maintained
  in [AGENTS.md](AGENTS.md); this file records design decisions rather than
  repeating those rules.
- Style variations (`lamutable/styles/*.json`) may explore alternate
  palettes/pairings, but the palette above is the default, locked look.
- Source brief: 2026-07-25 front-page redesign for La Mutable, a Valencia
  circus/dance/movement mutual-support association (`.hallmark/log.json`).
