# Event Kit — Minifesti, 22 November 2026

## Purpose and agreed scope

Event Kit is a pilot for an internal service that makes it easy for team members
to share event promotions. Generate the material locally, review it, and deliver
it through WhatsApp or email. Keep this pilot simple: local files and manual
sending, without a sharing website, accounts, or automated publishing.

For Minifesti La Mutable on **22 November 2026**, prepare one general invitation
and four workshop promotions. Each needs:

- WhatsApp status: image and accompanying text.
- Instagram post: image and accompanying caption.

Total: **10 images and 10 texts**, grouped into five ready-to-forward bundles.
Use Spanish for the promotional copy, consistent with the edition configuration;
workshop teaching languages are separate facts.

## Sources for the next session

Read these before generating:

- [Event facts and workshop IDs](event.json). The date and programme are recorded
  as confirmed by the user; preserve those confirmations.
- [Edition brief](brief.md) and existing previews, compositions, sources, and
  delivery records in this directory. Inspect existing work before recreating it.
- [La Mutable brand kit](../../../../brand/README.md), including WhatsApp copy rules.
- [Shared media formats](../../../../../../docs/media-formats.md).
- [Campaign instructions](../../README.md) and
  [SVG template workflow](../../template-workflow.md).
- [Supplied portrait template](../../templates/supplied-9x16-v01/README.md).

This brief defines the output scope for this pilot: WhatsApp and Instagram for
all five subjects. Older campaign recipes also mention Facebook and Meetup;
those additional outputs are outside this request.

Existing artwork is draft material, not automatically approved. The brand version
in event.json may lag behind the brand kit: resolve and record the version used.
Verify booking links and any prices or participation conditions before including
them. Do not invent missing facts or treat unresolved photo focal points as approved.

## Five bundles

1. `general`: general Minifesti invitation.
2. `thai-yoga-massage`: Masaje Thai Yoga — Bart.
3. `dance-lift`: Dance Lift: apoyándonos en movimiento — Emanuela y Tavi.
4. `contact-improvisation`: Improvisación de contacto · Corpo Sutil — Diana Flor.
5. `inward-yin-yoga`: INWARD — Yin Yoga y meditación guiada — Arancha.

Each workshop promotion must work independently: identify the workshop, teacher,
date, time, location, and booking action. Keep image text concise and put supporting
details in the accompanying copy. Follow the brand's tone and channel-specific rules.

## Local workflow

1. Read the sources, inspect existing assets, and identify missing information.
2. Reuse suitable editable templates and original photographs. Keep exact event
   text editable; follow the existing deterministic SVG rendering approach.
3. Prepare a general invitation and one workshop in both formats for review.
4. Apply feedback and generate the complete set, with matching channel-specific text.
5. Review facts, spelling, links, image crops, text fit, and mobile readability.
6. Save a new version of the delivery bundle; preserve earlier reviewed files.
7. Present the local kit for approval and manual distribution.

Suggested delivery layout (a proposal, not an existing command or implementation):

```text
event-kit/v01/
  general/
    whatsapp.png
    whatsapp.txt
    instagram.png
    instagram.txt
  thai-yoga-massage/
    ...same four files...
  dance-lift/
    ...same four files...
  contact-improvisation/
    ...same four files...
  inward-yin-yoga/
    ...same four files...
  review.md
  email-drafts.md
```

Record source/template versions, review status, and outstanding questions in
`review.md`. Plain-text copy files should contain only the text to copy and paste.

## Delivery method

WhatsApp is the proposed primary channel; email is an alternative.

- **WhatsApp:** send each image with its matching text, grouped by subject and
  clearly identifying whether it is for a status or Instagram post. Team members
  save the image and copy the text. Teachers can receive their own workshop bundle.
- **Email:** prepare one email per subject (five total). Attach its two clearly
  named images and include the corresponding texts in the body under channel
  labels. Save suggested subjects and bodies in `email-drafts.md`.

Recipients publish manually from their own accounts. Generating the kit does not
authorize sending messages, publishing content, or writing to production.
Recipients and actual sending must be explicitly requested separately.

## Next-session prompt

> Generate the Event Kit for Minifesti on 22 November 2026 using
> `sites/lamutable.es/campaigns/minifesti/editions/2026-11-22/event-kit.md`.
> Inspect and reuse existing campaign work, prepare the images and Spanish copy
> locally, and present the kit for review. Do not send or publish anything.

## Pilot feedback

After distribution, record whether team members could easily save an image, copy
the correct text, and publish it; note any manual fixes. Use those findings to
decide what to automate for future events.
