# Minifesti image campaigns

Status: the 22 November edition has ten v01 draft previews and editable SVG
compositions. Event facts and final review remain pending. No publishing is authorized.

One reusable recipe supports editions with 3–8 workshops. Each edition produces
one Instagram overview, one Facebook event cover, and one Instagram and one
Meetup image per workshop: 2 + 2 × workshop count outputs.

## Sources of truth

- [Shared media formats](../../../../docs/media-formats.md): dimensions and channel rules.
- [Brand kit convention](../../../../docs/brand-kits.md): identity and asset handling.
- [Recipe](recipe.json): output roles and workshop-count limits.
- [Art direction](art-direction.md): series appearance, pending visual input.
- Each edition's event.json: facts, ordered workshops, brand reference and variant.

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
   has a draft v0.1.1 brand kit, including its logo. Theme design guidance is not automatically
   a social brand kit; do not silently substitute another site's kit.
4. Add original photos and record their provenance. Set crop focal points only
   after inspecting the photos. Keep originals intact.
5. Incorporate the user's visual references and resolve art-direction.md. Choose
   one palette/shape variant for the entire edition, within the selected brand.
6. Resolve the edition brief before generating. Keep exact text and approved
   logos separate from generated imagery in editable compositions.
7. Produce versioned previews, review the complete set, then export approved
   final-size files. Record actual formats, fonts, source versions, deviations,
   alt text and review status in delivery.json. Do not overwrite reviewed versions.

## Review

Check 3–8 unique workshop IDs, one mapped photo per workshop, and 2 + 2N outputs.
Every workshop Instagram image must show all N photos with its own dominant.
Use count-aware layouts for 3–4, 5–6 and 7–8 photos; inspect readability rather
than shrinking one fixed collage. Adapt landscape compositions separately.
Check dimensions against the media catalogue, current destination requirements,
text accuracy, margins, contrast, photo crops, and mobile readability.
Facebook covers must not include visible URLs or QR codes.

No automation or dependencies are introduced. Do not use content publishing
commands for these campaign files. Production remains untouched.


## Supplied 9:16 poster template

The [supplied-9x16-v01 template](templates/supplied-9x16-v01/README.md) adapts
the user's `minifesti_9x16.svg` into live text and photo slots, with populated
22 November SVG and PNG previews. The original is preserved with provenance.
This separate sand/orange draft keeps the supplied design; v03 remains intact.
