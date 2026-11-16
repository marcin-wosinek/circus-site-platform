# Event Kit v08 · 22 noviembre 2026

Local draft for review. Every image label and all exported copy come from the
approved campaign text revision v02 (sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02/text.json,
SHA-256 9e6d7ae40823acc820250de86fccc04f5348bd07055611b33b92c8890e9e84ae), approved by Marcin at
2026-11-16T20:42:19.009Z. Artwork, photos and crops are the
v07 baseline, bound through event-kit/text-bindings.json.
Text widths were measured with the actual fonts; 10 output
dimensions verified.

Text approval does not approve visuals, alt text, photo permissions,
publication or sending. alt-text.md is carried from v07
and must be checked against these images. Visual review is pending.

Reproduce: node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build.mjs --text sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02 --version <new version>
Requires ImageMagick and the existing fonts. Refuses to overwrite an existing
version. Local draft; no publishing or sending performed.

## Terminology correction (issue #21)

Purpose: replace «Improvisación de contacto» with «Contact improvisación».
Text revision v02 was created from v01 and approved for these exact bytes. It
changes the workshop title, the programme line, the workshop copy, the
`workshop-name` labels and the `CONTACTO` supporting tags (now
`CONTACT IMPROVISACIÓN`). «Exploramos el contacto, el peso…» describes physical
contact and is intentionally unchanged.

Checks performed on 2026-11-16:

- `terminology:check` (es, concepts contact-improvisation and la-mutable)
  found no discouraged wording in all ten `.txt` copy files, `email-drafts.md`,
  `alt-text.md`, `index.html`, this file, the edition `delivery.json`, and the
  lettering extracted as plain text from all ten SVGs.
- Compared with v07, only `<text>` contents differ in the SVGs: two
  `workshop-name` labels and three supporting tags. Embedded photographs, crops
  and every other element are byte-identical. Only three copy files changed:
  general/instagram and both contact-improvisation files. Dates, times, venue,
  instructors and «Corpo Sutil» are unchanged.
- Measured label widths: workshop name 594/950 px (Instagram) and 651/950 px
  (WhatsApp); supporting tag 251/310 px.
- Every image was inspected at full size, and the full set at about 360 px
  wide. «CONTACT IMPROVISACIÓN» has the correct accent, sits on one line, and
  is not clipped. The supporting tag stays within its photo column. Contrast
  and layout match v07.
- All ten PNG hashes and dimensions match `manifest.json`.
- `alt-text.md` was carried from v07. Its workshop name was corrected after the
  build, as recorded in `manifest.json` under `altText`. Its descriptions
  still await review.

Still pending: visual approval, alt-text review and photo usage permissions.
Historical kits v01–v07, the v02/v03 previews and their records keep their
original wording.
