# Event Kit v09 · 22 noviembre 2026

Local draft for review. Every image label and all exported copy come from
sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02/text.json (SHA-256 b927158cf6331dd06d660a9edc972841b6a2f580ebf75b4248edb61da1a26a41). Artwork, photos and crops are the
v07 baseline and, for WhatsApp group images, the
event-kit/whatsapp-group templates, bound through event-kit/text-bindings.json.
Text widths were measured with the actual fonts; 15 output
dimensions verified.

Visuals, alt text, photo permissions, publication and sending are reviewed
separately. alt-text.md is carried from sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/alt-text.md
and must be checked against these images. Visual review is pending.

Reproduce: node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build.mjs --text sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02/text.json --version <new version>
Requires ImageMagick and the existing fonts. Refuses to overwrite an existing
version. Local draft; no publishing or sending performed.

## WhatsApp group images

Adds one `whatsapp-group` image and group message per subject, following the
`whatsapp-group-image` and `whatsapp-group-text` presets in
docs/media-formats.md. The example layouts were approved by Marcin on
2026-11-17 with the series orange accent and the teacher name on workshop
images. Templates: event-kit/whatsapp-group/ (rendered by
render-templates.mjs from templates.json and the edition's source photos).

Checks performed on 2026-11-17:

- The Instagram and WhatsApp Status PNGs are byte-identical to v08.
- `terminology:check` (es) found no discouraged wording in the five
  `whatsapp-group.txt` files, `alt-text.md` and `email-drafts.md`.
- Image lettering stays within 11 words. «CONTACT IMPROVISACIÓN» does not fit
  one line at the series size, so it uses the two-line layout; all other
  names fit on one line. Widths were measured with the actual fonts.
- The orange accent on cream has a 2.92:1 contrast ratio, below the brand
  kit's 3:1 for large text. Kept deliberately for series consistency.
- The Yin Yoga source photo carries its own «Yin Yoga con Arancha» lettering.

Still pending: a test send in WhatsApp to check chat-preview cropping and
readability, visual approval, review of the new alt text, and photo usage
permissions.
