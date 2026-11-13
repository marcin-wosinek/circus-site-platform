# Supplied Minifesti 9:16 template · v01

Adapted from the user's `minifesti_9x16.svg` on 13 November 2026 for the
[22 November edition](../../editions/2026-11-22/). Draft, pending visual approval.
This is an additional 1080 × 1920 portrait overview, not a replacement for v03
or the campaign's other channel formats.

## Edit and render

- Edit layout in [overview.svg](overview.svg): fourteen `{{name}}` text slots
  and four photo slots. Each text element has a stable ID.
- Edit edition display copy and photo paths in
  [content.json](../../editions/2026-11-22/compositions/supplied-9x16-v01/content.json).
  Paths resolve relative to that file. Photo order is Yin Yoga, Dance Lift,
  Thai Yoga Massage, Contact Improvisation, matching the supplied poster.
- Run from the repository root:

```sh
node sites/lamutable.es/campaigns/minifesti/templates/supplied-9x16-v01/render.mjs --replace-drafts
```

Omit the flag on first render. Existing populated SVGs are protected by default;
preserve a reviewed version before replacing drafts. The command writes a
self-contained editable SVG in the edition's `compositions/supplied-9x16-v01/`
and PNG previews in `previews/supplied-9x16-v01/` at 1080 × 1920 and 360 × 640.
The populated SVG opens directly in an SVG editor; text requires the fonts below.
No final exports or publishing are performed.

## Source and design decisions

The original SVG is preserved byte-for-byte in the edition's
`sources/supplied-9x16/original.svg`, with SHA-256 and origin in
`provenance.json`. Four embedded photos were extracted unchanged to that folder.
The source contains outlined lettering, not live text. Fixed logo geometry is
preserved; variable lettering is rebuilt as live text. The original typeface
cannot be recovered from its paths. Barlow Condensed ExtraBold replaces display
lettering, Arial Bold replaces supporting text; this changes the letter shapes.

The supplied sand/orange palette, rounded frames, photo crops, generous top and
bottom whitespace and booking panel are retained as an explicit reference-led
campaign variant. This differs from the earlier cream-wave v03 direction and
is not a change to the draft brand kit v0.1.2 or WordPress theme.
Existing source display titles are retained independently of the longer
programme titles in `event.json`; the two remain separately reviewable.

Each photo uses a fixed 475 × 395 frame with centred `slice` cropping.
Four photos are required. Text is one line with fixed size and alignment;
`maxWidth` in content.json records the available width. The renderer checks
actual font widths and fails on missing fields, missing photos or overflow.
Revise copy or layout deliberately; there is no automatic text compression.
This template does not implement 3–8-photo variants or landscape layouts.

## Rendering and review

Requires local ImageMagick, fontconfig, the existing v03 bundled Barlow font
(SIL OFL, see `../v03/fonts/OFL.txt`), and macOS Arial Bold at
`/System/Library/Fonts/Supplemental/Arial Bold.ttf` (not redistributed).
Uses the existing v03 fontconfig and ImageMagick's explicit MSVG renderer.
MSVG rendered the reference gradients as solid black; the template approximates
each gradient with 64 translucent vector strips. The original retains its
untouched gradients. Full-size and mobile previews were inspected for text fit,
photo visibility and layout. Font substitution, source rights, and final visual
approval still require attention before delivery. No reusable renderer API is
introduced by this edition-specific trial.
