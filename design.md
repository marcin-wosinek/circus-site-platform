# Design — Lamutable (La Mutable)

Locked design system for the lamutable.es WordPress theme. `lamutable/theme.json`
is the canonical source of truth (WordPress reads it directly); this file is
the narrative companion — genre, macrostructure, and rationale that raw JSON
doesn't carry. Future design work reads this first; templates and patterns
defer to it. Amend intentionally — the file is the rule.

## System
- Genre · playful (Valencia movement/circus/dance mutual-support association)
- Macrostructure · Ecosystem Index (front page)
- Theme · custom (vibe: "sun-warmed sand, playful movement, communal ease")
- Axes · light / geometric-sans / warm

## Tokens (canonical · `lamutable/theme.json` is the source of truth)
```css
:root {
  --wp--preset--color--paper:    oklch(93% 0.030 75);  /* background */
  --wp--preset--color--paper-2:  oklch(90% 0.032 75);
  --wp--preset--color--paper-3:  oklch(87% 0.034 75);
  --wp--preset--color--rule:     oklch(78% 0.020 72);
  --wp--preset--color--rule-2:   oklch(84% 0.018 73);
  --wp--preset--color--muted:    oklch(48% 0.016 45);
  --wp--preset--color--neutral:  oklch(42% 0.014 45);
  --wp--preset--color--ink-2:    oklch(38% 0.014 42);
  --wp--preset--color--ink:      oklch(20% 0.015 40);  /* text */
  --wp--preset--color--accent:   oklch(60% 0.150 38);  /* warm terracotta */
  --wp--preset--color--focus:    oklch(58% 0.190 38);

  --wp--preset--font-family--display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  --wp--preset--font-family--body:    "Geist", ui-sans-serif, system-ui, sans-serif;

  /* Type scale, ~1.25 ratio, fluid on the top two steps: */
  /* xs .75rem · sm .875rem · base 1rem · md 1.25rem · lg 1.5625rem ·        */
  /* xl 1.9531rem · 2xl 1.9531–2.4414rem (fluid) · display 2.25–3.5rem (fluid) */

  /* Spacing scale (settings.spacing.spacingSizes):                         */
  /* 3xs .125rem · 2xs .25rem · xs .5rem · sm .75rem · md 1rem · lg 1.5rem  */
  /* xl 2.5rem · 2xl 4rem · 3xl 6rem · 4xl 9rem                             */

  /* Layout: contentSize 48rem · wideSize 80rem */
}
```
No raw hex/px values are permitted in templates or patterns — every color and
size must trace back to one of the presets above (`var:preset|color|accent`,
`var:preset|spacing|lg`). If a pattern needs a value that doesn't exist yet,
add it to `theme.json` first, then reference it.

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
  (set in `theme.json` → `styles.blocks.core/navigation`). Links: Quiénes
  somos · Proyectos · Eventos; "Contacto" is the filled-pill CTA.
- States · hover/focus/current = accent underline (0.14em thick, 0.4em
  offset); active = accent text; focus ring = 2px `focus`, 3px offset.
- Mobile · core/navigation overlay menu (paper background, ink text) below
  600px; slab border carried onto the open overlay's edge.
- Files · pattern `lamutable/patterns/header.php` (dynamic URLs, i18n) →
  `parts/header.html`; slab CSS in `lamutable/style.css` § Header slab.
- Fonts now self-hosted: latin-subset variable woff2 for both families in
  `lamutable/assets/fonts/`, registered via `fontFace` in `theme.json` —
  no Google Fonts request at runtime.

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
- No designer on the team — the enforced project rule is zero raw hex/px in
  templates or patterns, presets only (see `README.md` § Design workflow).
- Style variations (`lamutable/styles/*.json`) may explore alternate
  palettes/pairings, but the palette above is the default, locked look.
- Source brief: 2026-07-25 front-page redesign for La Mutable, a Valencia
  circus/dance/movement mutual-support association (`.hallmark/log.json`).
