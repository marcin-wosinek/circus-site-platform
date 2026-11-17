# Minifesti image campaigns

Status: the 22 November edition has ten v01 draft previews and editable SVG
compositions. Event facts and final review remain pending. No publishing is authorized.

The current [22 November Event Kit](editions/2026-11-22/event-kit/v10/index.html)
contains five WhatsApp Status/Instagram/WhatsApp group bundles with Spanish
copy, editable SVGs and email drafts. v10 makes the workshop Instagram wave
periodic: both edges meet at y=650 with matching slopes for a consistent grid.
Text comes unchanged from text/v02. See the [wall preview](editions/2026-11-22/event-kit/v10/wall-preview.png).
v09 adds the WhatsApp group images
(`whatsapp-group-image`, 1080 × 1350) and group messages
(`whatsapp-group-text`) from the
[whatsapp-group templates](editions/2026-11-22/event-kit/whatsapp-group/);
the other images are unchanged from v08. Visual approval, a WhatsApp test
send, alt-text review and photo permissions remain pending. See its
[review record](editions/2026-11-22/event-kit/v09/review.md) and the edition
[delivery record](editions/2026-11-22/delivery.json). v08 and earlier kits are
kept unchanged as history.

v09 was rendered from
[text/v02](editions/2026-11-22/text/v02/text.json), the edition's current text;
apply feedback there in place.
[text/v01](editions/2026-11-22/text/v01/text.json) remains the verbatim
migration from v07. To reproduce:

```sh
node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/whatsapp-group/render-templates.mjs  # only after changing templates.json or photos
node sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit/build.mjs \
  --text sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/text/v02 --version <new version>
```

New kits always take the text file explicitly. See
[Campaign text](../../../../docs/campaign-text.md).

One reusable recipe supports editions with 3–8 workshops. Each edition produces
one Instagram overview, one Facebook event cover, and one Instagram and one
Meetup image per workshop: 2 + 2 × workshop count outputs.

## Sources of truth

- [Shared media formats](../../../../docs/media-formats.md): dimensions and channel rules.
- [Brand kit convention](../../../../docs/brand-kits.md): identity and asset handling.
- [Recipe](recipe.json): output roles and workshop-count limits.
- [Delivery recipe](delivery-recipe.md): v08-style image previews and download
  links, separate central channel documents, and a relevant rich Google Doc
  for every teammate. Use this for each edition's text and image handoff.
- [Art direction](art-direction.md): series appearance, pending visual input.
- Each edition's event.json: facts, ordered workshops, brand reference and variant.
- Each edition's optional team.json: campaign participants, roles and workshop
  associations. The [22 November team](editions/2026-11-22/team.json) records
  the eight participants supplied by the user.

### Campaign team data

`team.json` is a small edition-owned data convention, with `formatVersion: 1`,
`editionId`, a provenance `source`, and an ordered `members` array. Each member
has a stable `id`, the supplied `name`, a `roles` array (`organizer` and/or
`workshop-teacher`), and `workshopIds` referring to the edition's `event.json`.
An empty workshop array means no workshop association is recorded. Keep IDs
stable if display names change. Diana is listed as supplied by the user;
the associated workshop's existing instructor credit remains Diana Flor.

For future personal message drafts, select the sender by member ID and use
their recorded role and workshop associations with the verified event facts.
Store generated wording separately from team data and apply the shared
`whatsapp-group-text` format where appropriate. A role does not establish
someone's writing style, personal experience, preferred language, or permission
to send on their behalf; obtain those details when needed rather than inventing
them. This file stores facts only and introduces no message generation or
sending command.

### Personal group messages — 22 November 2026

Prepare two types of personal invitation using the shared
`whatsapp-group-text` preset, the brand kit, terminology, and verified edition
facts. Both start with a short introduction naming the sender and their role.
Use short paragraphs, WhatsApp formatting, and one clear invitation to join.

- **General:** write in Spanish, opening with an introduction such as
  «Hola, soy Marcin, uno de los organizadores de Minifesti La Mutable.»
  Invite the group to the whole event and give all four workshops equal
  weight. Include the date, programme times, venue, and full booking link.
- **Workshop:** write the entire message in the featured workshop's language.
  Introduce the teacher, lead with their workshop and what participants will
  explore, and highlight its time and language. Briefly mention the other
  three activities as part of Minifesti, then include the event date, venue,
  and full booking link. Use first-person singular or plural to match the
  sender: «doy» or «damos» in Spanish, for example.

Workshop language and introduction examples:

| Workshop | Message language | Introduction |
| --- | --- | --- |
| Masaje Thai Yoga | English | Hi, I'm Bart, one of the workshop teachers at Minifesti La Mutable. |
| Dance Lift | Spanish | Hola, soy Tavi, uno de los talleristas de Minifesti La Mutable. |
| Contact improvisación | Spanish | Hola, soy Diana Flor, una de las talleristas de Minifesti La Mutable. |
| INWARD — Yin Yoga y meditación guiada | English | Hi, I'm Arancha, one of the workshop teachers at Minifesti La Mutable. |

Adapt the introduction to the actual sender recorded in `team.json`; these
examples do not authorize sending messages on anyone's behalf. Store final
campaign wording in the edition's current `text.json` and follow the campaign
text delivery workflow above.

Paths inside JSON are relative to that JSON file unless explicitly labelled as
repository-relative. Null means unresolved, never permission to invent a value.
These JSON documents are planning conventions, not an implemented renderer or schema.

## Prepare an edition

Follow the [SVG template workflow](template-workflow.md) for the proposed
design, review, and deterministic production process. Record trial findings
there as described before extracting a reusable skill. The existing edition
scripts remain draft implementations, not the reusable renderer proposed by
that playbook.

1. Create editions/YYYY-MM-DD/ with event.json, brief.md, sources/,
   compositions/, previews/v01/, exports/v01/ and delivery.json, following the
   example edition. Copy the structure, not another edition's facts or exports.
2. Set the source URL and verify date, venue, language, workshop titles,
   instructors and times. Keep stable workshop IDs; array order is programme order.
3. Select the intended brand kit explicitly and record its version. La Mutable
   has a draft v0.1.3 brand kit, including its logo and
   [terminology](../../brand/terminology.json). Theme design guidance is not automatically
   a social brand kit; do not silently substitute another site's kit.
4. Add original photos and record their provenance. Set crop focal points only
   after inspecting the photos. Keep originals intact.
5. Incorporate the user's visual references and resolve art-direction.md. Choose
   one palette/shape variant for the entire edition, within the selected brand.
6. Resolve the edition brief before generating. Keep exact text and approved
   logos separate from generated imagery in editable compositions. Write the
   copy with the effective glossary
   (`npm run terminology:show -- --site lamutable.es --language es`); it
   requires «Contact improvisación», not «Improvisación de contacto».
   Before rendering, put the final copy, captions, alt text, and exact image
   lettering in plain text files and run
   `npm run terminology:check -- --site lamutable.es --language es <file> ...`.
   Review findings in context; do not rewrite quotations blindly.
7. Put every image label and all channel copy in the edition's campaign text
   (`editions/YYYY-MM-DD/text.json`). Check it with
   `npm run campaign:text:show`, export it with `npm run campaign:text:doc`,
   and deliver it as a Google Doc. Apply feedback by editing `text.json` in
   place and updating the doc, then render.
8. Produce versioned previews, review the complete set, then export approved
   final-size files. Record actual formats, fonts, source versions, deviations,
   alt text and review status in delivery.json. Do not overwrite reviewed versions.

## Review

Check 3–8 unique workshop IDs, one mapped photo per workshop, and 2 + 2N outputs.
Every workshop Instagram image must show all N photos with its own dominant.
Use count-aware layouts for 3–4, 5–6 and 7–8 photos; inspect readability rather
than shrinking one fixed collage. Adapt landscape compositions separately.
Check dimensions against the media catalogue, current destination requirements,
text accuracy, margins, contrast, photo crops, and mobile readability.
Read the exact wording in every final rendered image, including uppercase
labels, line wrapping, accents, and clipping; a clean terminology check does
not cover rendered images. Existing reviewed versions stay intact: correct
terminology in a new version.
Facebook covers must not include visible URLs or QR codes.

No automation or dependencies are introduced. Do not use content publishing
commands for these campaign files. Production remains untouched.


## Supplied 9:16 poster template

The [supplied-9x16-v01 template](templates/supplied-9x16-v01/README.md) adapts
the user's `minifesti_9x16.svg` into live text and photo slots, with populated
22 November SVG and PNG previews. The original is preserved with provenance.
This separate sand/orange draft keeps the supplied design; v03 remains intact.
