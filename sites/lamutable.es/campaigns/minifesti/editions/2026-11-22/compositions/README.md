# Editable draft compositions

`v01/` contains ten self-contained SVGs with embedded original photos, a separate
generated botanical image, editable text and cream wave paths. Open in an SVG
editor. These are drafts, pending event facts and user review; no production
publishing occurred.

Regenerate from the repository root with:

```sh
node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/compositions/render-v01.mjs
```

Requires ImageMagick and installed Arial / Arial Narrow Bold. The latter is an
explicit local substitution for unavailable Barlow Condensed; font files are
not distributed. The command replaces only this edition's v01 drafts and
delivery record. Preserve a reviewed version before regenerating.

Spanish date labels are provisional; workshop short titles retain their names.
Year and venue are omitted. Meetup drafts use a single photo, title, date,
time, teacher and event identity. Full photos are fitted without cropping.
Source rights and final copy still require review. Project canvas presets are
used without claiming independently verified current platform requirements.

The botanical decoration used the built-in image_gen tool; exact prompt is in
`../sources/generated/prompt-v01.txt`. All lettering and photographs were
composed separately, without generating participants or logos.

## Confirmed-facts revision v02

Use `render-v02.mjs` for the latest set in `v02/` and `../previews/v02/`.
The user confirmed 22 November 2026, the Samadhi venue and full address, Spanish
only, and the final programme. v01 remains an earlier draft. v02 includes these
facts and Spanish workshop labels; final visual review is pending.
