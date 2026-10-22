# Design — Fusion Circus

## FAQ pattern (2026-10-22)

The FAQ section uses a constrained, single-column group with the existing `lg`
vertical spacing preset, an H2 section heading, H3 question headings and native
Accordion blocks. It inherits the theme typography and colors without adding
decoration. Questions are sibling Accordion Items within one Accordion; answers
contain editable paragraphs, never nested Accordions. Three example questions
provide an editable starting point, and each insertion is independent.

Locked design system. Future design work (Hallmark runs, templates, patterns)
reads this file first and defers to it. Amend intentionally — the file is the
rule. In this repo `theme.json` is canonical for tokens (WordPress reads it);
this file is the narrative record and rationale.

<!-- Hallmark · studied: yes · DNA-source: image (user's own v1 mockups) · date: 2026-07-26 -->

## System

- Genre · atmospheric (photo-led night-party mood on light lavender paper)
- Macrostructure · Photographic — every major band is image-led; text annotates
  or overlays. Above the fold it leans Marquee Hero (statement over full-bleed photo).
- Theme · studied-DNA (source: own Figma/mockup exports, v1, 5 pages)
- Axes · light paper (chromatic-violet) / roman editorial serif display / dual accent magenta + violet

## Provenance

Extracted from five user-attached mockup images (home, event, code of conduct,
collaborations, blog post) on 2026-07-26. Image mode: **tokens are estimated**
from the source images' colour bands; **fonts are role-based with named
candidates** from the free canon — confirm against the mockup file and replace
if the real faces differ. Rhythm read from a vision pass on the captures.

## Tokens (estimated — persist into `theme.json` presets; theme.json is canonical)

```css
:root {
  --color-paper:      oklch(93% 0.025 300);  /* lavender page background */
  --color-paper-2:    oklch(89% 0.035 300);  /* deeper lavender wells (form panels) */
  --color-card:       oklch(99% 0.005 300);  /* floating white cards */
  --color-ink:        oklch(20% 0.02 300);   /* near-black body text */
  --color-ink-2:      oklch(45% 0.02 300);   /* muted secondary text */
  --color-rule:       oklch(85% 0.02 300);
  --color-accent:     oklch(58% 0.24 350);   /* magenta — headings & identity ONLY */
  --color-accent-2:   oklch(48% 0.21 295);   /* violet — interactive elements ONLY */
  --color-accent-ink: oklch(99% 0 0);        /* text on filled accents */
  --color-focus:      oklch(48% 0.21 295);
  --color-scrim:      oklch(25% 0.09 320 / 0.75); /* duotone photo overlay base */
  --gradient-flood:   linear-gradient(90deg, oklch(48% 0.21 295), oklch(58% 0.24 350));
                      /* header scrims + footer band ONLY — never section backgrounds */

  --font-display: "Playfair Display", serif; /* candidate — alt: Fraunces. Roman only. */
  --font-body:    "Jost", sans-serif;        /* candidate — alt: Poppins */

  --radius-card: 24px;  --radius-pill: 999px;  --radius-input: 999px;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 180ms;  --dur-base: 240ms;
}
```

## Signature moves (the brand's fingerprint — keep)

- Duotone magenta→violet scrims over full-bleed party/location photos.
- Giant **ghost serif watermark type** bleeding across photos ("fusion dance",
  country names on event banners).
- **Floating white cards** (24px radius, soft shadow) overlapping section edges.
- **Circular badge motif** — round logo splitting the nav link row (3 left ·
  2 right, transparent over photo header); round date stamps on blog cards.
- Section heads: centred magenta Jost heading hanging in negative space, short
  centred intro line beneath. No eyebrows, no numbering, no rules.
- Footer: single copyright line over the gradient flood band (Ft2).

## CTA voice

- Primary (amended 2026-08-05) · magenta fill (`--color-accent`) · pill radius ·
  sans-serif Jost label. Buttons now use the body sans-serif for clearer,
  friendlier action labels; the former serif-button quirk is retired.
- Secondary (on photos) · white fill, ink text, pill — must meet contrast on
  busy imagery (see Notes).
- Tertiary (amended 2026-08-05) · "Ghost" — magenta 2px outline pill, transparent
  fill, magenta label; fills magenta on hover. Paper/card grounds only, never on
  photos (outline contrast can't be guaranteed on imagery).

## Motion stance

- Motion-cut: no JS animation libraries (build-step-free theme). CSS-only
  transitions on interactive elements; at most one fade-up reveal if ever added.
- Reduced-motion fallback · ≤150 ms opacity crossfade.

## Notes — anti-patterns from v1 NOT to carry over (locked 2026-07-26)

- **Accent discipline, amended 2026-08-05:** violet = headings and interactive
  elements; magenta remains an identity accent. Gradient floods stay capped at
  the header scrim + footer.
- **Left-align long prose.** v1 centres multi-paragraph text (event "About",
  blog posts) — headings stay centred, body copy goes left-aligned.
- **Vary section rhythm.** v1 pads every section equally, which reads
  templated — alternate spacing steps between bands.
- **Fix chip contrast on photos.** v1's small white "See more" chips and white
  nav links sit on busy imagery; guarantee the scrim behind them or enlarge/
  restyle to meet contrast + 44px hit targets.
- Italic never appears in headings; emphasis via weight or magenta.

## Applied to theme.json (locked 2026-07-26)

Tokens persisted as presets in `fusion-circus/theme.json`. OKLCH values were
converted to sRGB hex (the Site Editor color UI needs concrete values);
theme.json is now canonical for the exact numbers.

- Palette slugs · `paper #eae4f7` · `paper-2 #ded6ef` · `card #fcfbff` ·
  `ink #17141e` · `ink-2 #57535f` · `rule #cfcbd9` · `accent #d7068e` ·
  `accent-deep #b80076` (magenta hover and outlined-button text, added
  2026-08-05) ·
  `accent-2 #6b32c4` · `accent-2-deep #5722a3` (oklch 41% 0.19 295 — button
  hover, added 2026-07-26) · `accent-ink #fcfcfc` · `scrim #330e3cbf`
  (75 % alpha).
- Gradient preset `flood` (90°, violet→magenta) — header scrim + footer only.
- Duotone preset `night-flood` (`#330e3c` → `#d7068e`) for photo scrims.
- Fonts self-hosted in `assets/fonts/` (latin-subset variable woff2 from the
  Google Fonts CDN, registered via `fontFace`): Playfair Display 400–900
  roman (`display`), Jost 100–900 roman + italic (`body`). Candidates from
  the Provenance section confirmed as the pick.
- Type scale · `sm 0.875rem` → `5xl 3rem`; default palette/font-sizes/
  spacing disabled so the editor offers only ours.
- Heading hierarchy (relocked 2026-08-05) · H1 `5xl` (3rem) → H2 `4xl`
  (2.25rem) → H3 `3xl` (1.75rem) → H4 `2xl` (1.5rem) → H5 `xl`
  (1.25rem) → H6 `lg` (1.125rem); body remains `md` (1rem). H1 is exactly
  3× body copy, H2 sits at three quarters of H1, and the lower levels descend
  in restrained steps to keep H6 distinct without competing with body copy.
  Fixed sizes keep the hierarchy consistent across viewport widths; long H1
  copy must still be checked at 320px as part of normal page-level QA.
- Heading families (amended 2026-08-05) · H1 alone uses Playfair Display 600;
  H2–H6 use Jost 600. This reserves the editorial display voice for the page
  title while giving section and sub-section headings a clearer sans-serif
  hierarchy consistent with body copy and controls.
- Spacing scale · `2xs 0.25rem` → `3xl clamp(5rem,12vw,8rem)`; the three
  clamp steps (`xl`–`3xl`) exist to vary section rhythm between bands.
- Radii + motion under `settings.custom` → `--wp--custom--radius--card|pill|input`,
  `--wp--custom--ease--out`, `--wp--custom--duration--fast|base`.
- Default styles · body = Jost on `paper`; H1 = Playfair 600 roman and H2–H6 =
  Jost 600 roman, all in `accent-2` (`#6b32c4`, RGB 107 50 196; heading-family
  split amended 2026-08-05); links = `accent-2`; buttons = magenta pill, Jost
  label (amended 2026-08-05).
  Button states locked 2026-07-26 — see § Buttons.

## Header (locked 2026-07-26)

Built as `parts/header.html` → pattern `fusion-circus/header`, implementing the
badge-split nav from Signature moves.

- Row · Home · Events · Blog ‖ round badge ‖ Collaborations
  (badge also links home). Desktop: nav halves get
  equal flex so the badge stays dead-centre. Mobile
  (<782 px): badge on top, link rows centred beneath — verified no horizontal
  scroll at 320/375.
- Band background · the `flood` gradient (its header-scrim allowance) on photo
  and non-photo pages alike, so link contrast never depends on the imagery.
- Logo asset · `assets/images/fusion-circus-badge-inverse.png` — the inverse
  (dark-ground) round symbol, whitespace-trimmed, 360 px source. Display width
  is the token `custom.size.badge` = clamp(4.5rem, 9vw, 6.5rem).
- v1 contrast fix applied · white Jost `md` links with ≥44 px hit targets
  (token `custom.size.tap` = 2.75rem), hover underline, `accent-ink`
  focus-visible ring (tokens `custom.focus.width/offset`).
- Submenus (2026-10-16) · dropdown panels use `card` ground, `rule` border
  and `ink` text with `accent-deep` hover, instead of inheriting the band's
  white link color onto core's white panel.
- Nav URLs point at `/events/`, `/blog/`, `/collaborations/` — those pages don't exist yet; create them as content
  work proceeds.
- `functions.php` now also loads `style.css` as editor style so the Site
  Editor mirrors the hand-written header CSS.

## Footer (locked 2026-07-26)

Built as `parts/footer.html` → pattern `fusion-circus/footer`, implementing the
flood band from Signature moves.

- A centred policy navigation row links to `/code-of-conduct/` and
  `/terms-and-conditions/`, followed by © year + site title, both dynamic
  (`date_i18n`, `get_bloginfo`). Policy links moved here 2026-09-18.
- Band · the `flood` gradient (its footer allowance) with `md` padding.
  Text is `accent-ink` Jost `sm`; contrast at the gradient's magenta end
  ≈ 4.75:1 — passes AA for small text.
- Sticky footer · `.wp-site-blocks` becomes a flex column at `min-height:
  100svh` with `main` growing, so on short pages (404, Code of Conduct) the
  band meets the viewport bottom instead of floating above bare paper.
- By filename, `parts/footer.html` overrides the parent Twenty Twenty-Five
  footer sitewide. The original copyright-only version was verified desktop /
  375 / 320 (emulated); the policy navigation uses wrapping links for narrow widths.

## Buttons (locked 2026-07-26)

Core/button styled per § CTA voice: the default (Fill) is the primary CTA;
two block styles registered in `functions.php` are the alternates, styled in
`style.css` (which `add_editor_style` mirrors into the editor).

- Default (Fill; amended 2026-08-05) · magenta pill, Jost 500 label.
  Hover/active darken to `accent-deep`; active additionally presses down 1px
  (transform-only, no transition). No shadows or lift.
- `is-style-on-photo` · "On photo (white)" — the locked secondary CTA: `card`
  fill, `ink` text, `paper-2` hover, **`accent-ink` focus ring** (violet would
  vanish against dark scrims).
- `is-style-ghost` · "Ghost (outline)" — tertiary: 2px `accent-deep` outline
  (token `custom.border.width`), transparent fill, fills deep magenta on hover.
  Paper/card grounds only.
- Focus moved from theme.json `:focus` to CSS `:focus-visible` (2px `accent-2`
  ring, offset — the old no-offset ring was invisible against the violet fill),
  matching the header's focus pattern.
- Shape · `min-height` = `custom.size.tap` (44px hit target), `xs`/`md`
  padding, inline-flex centring; color transitions at `duration.fast` /
  `ease.out`, reduced-motion collapses them.
- Contrast (WCAG; amended 2026-08-05) · label on magenta fill 4.75:1 · on
  deep-magenta hover 6.20:1 · ink on card 17.6:1 · deep-magenta ghost on
  paper 5.13:1 — all AA+.
- core/button renders a plain link — disabled/loading/error/success states
  don't exist for it; only default/hover/focus-visible/active are styled.
- Verified · desktop + emulated 375: single-line labels, 44–46px heights, no
  horizontal scroll; both styles present in the block-styles registry.

## Exports

`theme.json` (settings.color.palette, typography, spacing) is the source of
truth in this repo. Hand-written CSS references presets only
(`var(--wp--preset--…)`). For a standalone `tokens.css`, Tailwind `@theme`, or
DTCG `tokens.json`, ask to extend design.md with that export.

## Fair event template (locked 2026-08-05)

- `templates/single-fair_event.html` targets the `fair_event` post type and
  delegates its body layout to `fusion-circus/single-fair-event`.
- Event entries show the title, featured image, content, tags, and comments.
  Author attribution, the parent theme's "More posts" section, and previous /
  next post navigation are intentionally absent: an event page should remain
  focused on the event rather than exposing editorial-blog metadata or exits.
- Spacing uses the locked `lg` and `xl` presets; the template introduces no new
  visual tokens or CSS.
