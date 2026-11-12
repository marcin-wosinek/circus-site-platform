# Minifesti template trial v03

New SVG templates authored from scratch, using La Mutable draft brand v0.1.0
and the November edition direction. These are **two populated review examples**,
not an approved template or final campaign. v01/v02 and their delivery record
remain intact. Review these before expanding into other workshops or landscape.

## Design plan

Cream #F9E9D4 is the continuous surface, ink #262122 carries the title,
burgundy #AE184D identifies the date, and olive #4F602D supplies one small
botanical accent. Natural photographic colours remain untouched.
Barlow Condensed ExtraBold supplies the tall, heavy heading; Arial carries
practical information. No synthetic letter compression or generated lettering.

The overview uses two portrait photographs above a wide wave, with the two
other practices below. Left alignment connects the title, date, and venue.
The workshop design uses a large landscape photograph, a two-line title,
date and teacher, and a smaller strip showing the other practices.

```
Overview                     Workshop example
┌────────────┬────────────┐   ┌─────────────────────────┐
│ Dance Lift │ Thai Yoga │   │ Contact photo, dominant │
├~~~~~ cream wave ~~~~~~~┤   ├~~~~~~~ cream wave ~~~~~~┤
│ La Mutable            │   │ Workshop title          │
│ MINIFESTI       sprig │   │ Teacher / date / event  │
│ Date            Hours │   ├───────┬────────┬────────┤
├~~~~~~~~~~~┬~~~~~~~~~~~┤   │ Other │ Other  │ Other  │
│ Contact   │ Yin Yoga  │   ├───────┴────────┴────────┤
├───────────┴───────────┤   │ Venue and address       │
│ Venue and address    │   └─────────────────────────┘
└──────────────────────┘
```

Brief review: cream, condensed type and waves are specifically supplied brand
and campaign requirements. The composition uses the actual photograph shapes;
no generic cards, extra slogans, prices, registration links, or logo are added.
The botanical detail is a small editable vector, rather than a generated bitmap.

## Run

From the repository root:

```sh
node sites/lamutable.es/campaigns/minifesti/templates/v03/render.mjs
```

Requires ImageMagick (tested with 7.1.2-5), fontconfig, the bundled Barlow font,
and macOS Arial at the explicit path checked by the command. Barlow is licensed
under SIL OFL 1.1; see `fonts/OFL.txt`. Font source:
https://github.com/google/fonts/tree/main/ofl/barlowcondensed.
Arial is a locally licensed system font and is not redistributed.
`fontconfig.xml` makes the bundled heading available without installing it.
The renderer is deliberately a local macOS trial, not portable shared tooling.

Existing SVG/PNG examples are protected by default. To revise unapproved drafts:

```sh
node sites/lamutable.es/campaigns/minifesti/templates/v03/render.mjs --replace-drafts
```

Preserve a reviewed revision in a new version folder before using that flag.
Outputs: the edition's `compositions/v03/`, `previews/v03/`, 360px mobile previews,
contact sheet, and an independent delivery record with source/template hashes.
No production writes or publishing commands are involved.

## Slot contract

`{{name}}` is this trial's binding syntax. Templates contain the design;
`event.json` owns facts; `trial.json` owns the example selection, deliberate
source crops and display copy. Text is XML escaped. SVG photo/text fragments
are emitted internally and are not accepted from event data.

| Slot | Source | Bounds and behavior |
| --- | --- | --- |
| heading | trial heading | One line, Barlow 183px, max 957px; fail on overflow |
| organizer | trial organizer | Arial 31px at x65/y605; fixed La Mutable trial copy |
| date / hours | event date; first/last workshop times | Barlow 53px / Arial 34px; combined width checked within 950px |
| photos | four original workshop files | Named placements in renderer, explicit source crops then contain; cream fills unused area |
| featuredPhoto | selected workshop photo | 1024 × 660 frame, whole source contained |
| titleLines | trial display titles | Exactly two lines, Barlow 99px, 92px baseline step, max 950px per line |
| teacher | trial display subtitle | Arial 32px, max 950px |
| dateTime | event date + featured workshop times | Barlow 44px, max 950px |
| identity | event title + existing brand signature | Arial 28px, fixed current-edition copy |
| supportingPhotos | all remaining workshop files | Three 334 × 162 frames, crop then contain |
| venue / address | event venue / brief-derived short address | Arial 30px / 26px, max 950px; postal code omitted for this display |
| palette slots | brand tokens | Required cream, ink, burgundy, olive |

All fact/photo slots are required for this trial. Missing photos, fonts, text,
invalid crops, wrong workshop counts, unbound slots and measured overflow fail
visibly. It supports four workshops and the selected two-line example only.
Additional names/counts/formats require a deliberate template revision and review.
The crop rectangles are in original-image pixels; their centres act as local
focal points. The renderer does not modify the edition's unresolved general
`focalPoint` fields or pretend these choices suit all formats.

## Review and limitations

Both outputs were inspected at 1080 × 1350 and as 360 × 450 mobile previews.
The Yin Yoga source has baked-in text: its crop was revised to remove fragments
without editing or regenerating the person. Dance Lift retains the essential
hands and feet. The overview's upper portrait photos have more visual area than
the lower photos: this follows the reference's arrangement but remains a review
tradeoff against equal prominence. Address text is supporting detail at mobile
size and should also appear in the eventual post caption.

ImageMagick's MSVG rendering failed to show the initially transformed branch.
It was simplified to absolute SVG coordinates and re-rendered successfully.
The final editable SVG and PNG were visually checked; do not assume all SVG
features are supported. Layout and crop review remains necessary beyond the
font-width checks. Font substitution is rejected by file checks and explicit
fontconfig; another machine must also verify its resolved font selection.

Next review: visual direction, short title treatment and photo prominence.
After acceptance, design the other workshop examples and separate landscape
variants, review them, and only then produce all ten. Source photo permissions
and destination export checks remain unresolved. No final exports are approved.
