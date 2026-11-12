# SVG campaign template workflow

Status: proposed working playbook for repeated trials. This document does not
implement a renderer or define a stable template schema. Refine it through real
campaigns before extracting a reusable skill.

## Principle

AI designs and revises an editable SVG template. JavaScript fills the approved
template with original photographs and exact event data. Routine production
does not ask an image model to redraw the poster, its lettering, or its people.

A template includes photo slots, text slots, layout rules, and overflow behavior;
an attractive background alone is not a template. Optional AI-generated textures
or illustrations remain separate assets.

## Inputs for each run

- Original SVG references and an explanation of what to preserve or improve.
- The selected site's brand kit and version; keep brand rules in that kit.
- Event facts, ordered workshops, and any approved short display titles in
  the edition's `event.json`.
- Original photos, provenance, and inspected crop focal points.
- Required output roles and sizes from `recipe.json` and the media catalogue.
- An edition brief identifying unresolved facts and visual decisions.

Read the campaign and edition art direction as well as the brand kit. Do not
invent missing facts. Mark unresolved fields in drafts and resolve required
fields before final export.

## 1. Inspect the reference

Read the original SVG structure and inspect its rendered appearance. Identify
text, outlined lettering, embedded photos, masks, decorative paths, and fonts.
Record which elements can be reused and which need reconstruction. Outlined
lettering may preserve a fixed heading but cannot serve as editable event text.

Preserve the original. Render a temporary preview only when needed for visual
inspection or a tool that cannot accept SVG. Keep SVG as the source of truth;
do not convert it to PNG and then reconstruct the entire design from the PNG.
Opening Inkscape manually is not a routine pipeline step. If a renderer cannot
handle a reference feature, record the incompatibility and deliberately simplify
it or choose a compatible renderer.

## 2. Design a populated template

Have AI author or adapt SVG code with named slots, for example `event-title`,
`date`, `venue`, `featured-photo`, and `supporting-photos`. These names are
illustrative, not an implemented binding API.

Separate the reusable design from edition data. Keep shapes, photo masks,
decorations, and editable text distinct. Do not bake dates, addresses, workshop
names, or image paths into the renderer.

Define for each slot:

- Its data source, required/optional status, and bounds.
- Font, size range, line limits, and alignment for text.
- Fit or crop policy and focal point for photos.
- Behavior when content is missing or exceeds its bounds.

Prefer an explicit short title or a layout revision to uncontrolled shrinking.
Fail visibly on unresolved overflow; never silently truncate essential facts.
Escape inserted text as XML and validate data before rendering.

Use the actual event data and photos from the outset. Start Minifesti with one
portrait overview and one portrait workshop example. Review hierarchy,
typography, spacing, photo treatment, and mobile readability before generating
the whole set. Record the approved template version and review decision.

## 3. Add deliberate variants

Design landscape layouts separately rather than stretching portrait artwork.
Add workshop-count variants as needed. Minifesti's recipe anticipates groups
of 3–4, 5–6, and 7–8 workshops; a four-photo design is not automatically suitable
for eight photos.

Follow the recipe's overview and featured-workshop photo rules. Resolve the
Meetup photo policy in the brief. Keep palette, typography, and decorations
consistent across the edition. Review each newly introduced layout with real
content before batch production.

## 4. Fill and render deterministically

Use a small JavaScript command to load event data, select a template variant,
bind text and original photos, and emit a populated SVG and PNG for each output.
Select one headless renderer after checking it against the actual SVG features;
record its version and required fonts. Do not introduce multiple conversion
tools without a demonstrated need.

Use explicit, available fonts with suitable licensing. Missing fonts should
produce a clear error rather than an unnoticed substitution. Keep originals
intact, and make image treatment reproducible from recorded crop settings.

Validate required fields, photo paths, unique workshop IDs, supported counts,
output dimensions, and expected output count. Verify text bounds with the actual
fonts and renderer. Add tests for reusable parsing, binding, and validation when
that tooling is implemented; visual review remains necessary.

Keep reusable templates outside edition folders, with versioned populated SVGs,
previews, and final exports inside each edition. Establish exact paths and command
names during implementation, not by treating this proposal as existing tooling.
Preserve reviewed versions when rerunning.

## 5. Review and deliver

Produce a contact sheet and inspect individual outputs at final size and at a
realistic mobile viewing size. Check exact text, overflow, contrast, margins,
photo crops, essential body parts, and consistency across formats.

Record template, renderer, font, brand, and source versions in the delivery
record, alongside unresolved issues and review status. Export approved assets
only after corrections. Export does not authorize publishing or production
writes.

## Trial log

Add this section to each edition's notes after a run:

```markdown
### Template workflow trial
- Date and edition:
- Reference SVG and brand version:
- Template version and variants used:
- Renderer and fonts:
- Outputs reviewed:
- What worked:
- Manual interventions and why they were needed:
- Text fitting or crop failures:
- User feedback and resulting revisions:
- Repeatable rule worth keeping:
- Campaign-specific exception:
- Next workflow change to try:
```

## Extracting a skill after several trials

Compare the logs and extract only steps that proved useful across runs. A future
skill should explain input discovery, SVG inspection, populated-template review,
data binding, deterministic export, and visual verification. Include a worked
example and known failure cases. Keep site identity, campaign layouts, event
facts, and output-specific policies in referenced project files.

Separate the skill's instructions from the renderer's implementation. Avoid
turning one edition's hardcoded decisions into universal rules. The skill should
support both designing a new template and filling an existing approved one.

## Tradeoffs to revisit

SVG preserves editable shapes and text and stays close to the supplied source,
but font handling, text fitting, and renderer compatibility require deliberate
work. Generated decorative backgrounds can enrich a design but are flattened
and less adaptable. Generating complete posters repeatedly offers flexibility
at the cost of predictable text, photo fidelity, and consistency.

The first template takes design effort. The intended payoff is that subsequent
editions need data and crop review rather than a fresh poster reconstruction.
