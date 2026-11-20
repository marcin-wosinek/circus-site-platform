# brussels.fusion-circus.com

Production: <https://brussels.fusion-circus.com/>

This website is tracked directly in the platform repository. Local WordPress
runs at <http://localhost:9794> and mounts the shared Fusion Circus theme
from `sites/fusion-circus`, which is tracked in this repository. Start with:

```sh
npm run bootstrap -- brussels.fusion-circus.com --apply
```

Run these commands from the platform root. Credentials belong in the ignored
`.env.import-local/brussels.fusion-circus.com` file; use this site's
`.env.import-local.example` as a template. Bootstrap checks production, starts
WordPress without plugins, imports the production database and uploads, then
mounts the imported plugins and verifies the local result. It destructively
replaces only this site's local database and uploads; production is read-only.

For subsequent local operations:

```sh
npm run start -- brussels.fusion-circus.com
npm run stop -- brussels.fusion-circus.com
npm run update -- brussels.fusion-circus.com
```

The production theme was confirmed as `fusion-circus` on 2026-09-23. Theme
changes in the shared theme affect every local site using that source.
See [production imports](../../docs/import-production.md) for prerequisites
and recovery, and [adding sites](../../docs/adding-sites.md) for setup guidance.

## Adding an FAQ

In the page editor, open **Add block (+) → Patterns**, search for
**Frequently asked questions**, and insert the Fusion Circus pattern.
Replace the section heading, questions and answer prompts before publishing.
Each insertion is an independent copy; editing it does not change other FAQs.

To add a question, open **List View**, select an **Accordion Item** inside the
Accordion, and choose **Duplicate**. Edit its heading and answer. Select the
whole Accordion Item to move or remove a question. Keep all Accordion Items at
the same level inside the Accordion; do not insert an Accordion into an answer.
Preview the page and check that every question is visible with all answers
collapsed, then open each answer before publishing.

The pattern is provided by the shared theme at
`fusion-circus/patterns/faq.php` and requires WordPress's native Accordion blocks.
It becomes available on production when that theme file is deployed.

## Managed homepage and upcoming events

The static front page is managed by `content-publish.json`; its block markup
and referenced images live in `content/pages/homepage/`. The exported artifact
preserves the current production page title. Edit locally, then:

```sh
npm run content:export -- brussels.fusion-circus.com --key homepage
```

The upcoming section uses Fair Events' **Events List** with the theme pattern
`fusion-circus/upcoming-event-cards`: at most four published event posts,
soonest first, excluding past events. Recurring entries use the next upcoming
occurrence. Cards show the event title, date, time, venue and event-page link.
Images use the featured image, falling back to the first image in event content;
set a featured image to explicitly choose the card artwork. An event without
an image retains a plain coloured image area. Layout changes from four columns
to two and then one on narrow screens. An empty list uses Fair Events' standard
no-events message.

Local preview: <http://localhost:9794/>. The card block and pattern are provided
by the live-mounted shared theme, so no plugin upgrade is needed. Deploying
later requires both the shared theme changes and the managed homepage artifact;
no production content is changed by local testing or export. See
[publish content](../../docs/publish-content.md) for plan and guarded apply.
A production pull replaces local authoring changes; export them first. To
restore this committed homepage after a pull, materialize `{{SITE_URL}}` in
`content.html` as `http://localhost:9794` and update the local static front page
with WP-CLI or paste the markup into its code editor.

## Photo hero sections

The first, photographic Cover on the homepage and the service pages uses the
shared theme's **Photo hero** style (theme 0.1.5 or later; see
`sites/fusion-circus/design.md` § Photo hero). Below 782px it shows a square
crop of the photo that fades into the page background, with the copy
underneath. Wider screens show the Cover unchanged.

For a new or changed hero:

1. Select the page's first Cover and choose **Styles → Photo hero**.
2. Keep the Cover's **Focal point** where it suits desktop: the subject should
   stay clear of the text column.
3. In **Photo hero: mobile crop**, place the **Mobile focal point** on the
   photo's main subject.
4. Preview at 390px and at desktop width before saving.
5. Don't give hero text its own light colours for mobile. The style turns
   white or uncoloured copy into dark text below 782px, and a light custom
   colour would be unreadable on the fade.

Current settings:

| Page | Managed key | Cover focal point | Mobile focal point |
|---|---|---|---|
| `/` | `homepage` | 39% 64% | 62% 50% |
| `/personalised-bodywork-brussels/` | `personalised-bodywork-brussels` | default | 75% 40% |
| `/thai-yoga-massage-brussels/` | `thai-yoga-massage-brussels` | default | 66% 50% |
| `/kobido-massage-brussels/` | `kobido-massage-brussels` | 49% 66% | 75% 45% |
| `/massage-gift-vouchers/` | `massage-gift-vouchers` | default | 74% 45% |
| `/relax-together/` | `relax-together` | 44% 69% | 68% 70% |

The gift vouchers and Relax Together pages are managed artifacts:

```sh
npm run content:export -- brussels.fusion-circus.com --key massage-gift-vouchers
npm run content:export -- brussels.fusion-circus.com --key relax-together
```

The bodywork, Thai and Kobido pages are managed in matching
`content/pages/<key>` directories. Their PDFs and video are reference-only
uploads, verified against import provenance during export and production bytes
during plan. Preserve local edits before a fresh import if provenance is missing.
Export and run a read-only plan after committing each artifact:

```sh
npm run content:export -- brussels.fusion-circus.com --key personalised-bodywork-brussels
npm run content:plan -- brussels.fusion-circus.com --key personalised-bodywork-brussels
```

Use `thai-yoga-massage-brussels` and `kobido-massage-brussels` for the other
pages. Keep their production attachment IDs and hero settings when exporting.
Planning does not publish content.

## Workshops page

The `/events-calendar/` page ("Workshops") is managed by `content-publish.json`
under the `events-calendar` key, with its markup in
`content/pages/events-calendar/`. Its list is Fair Events' **Events List**
with the theme pattern `fusion-circus/upcoming-event-rows`: every published
upcoming event, soonest first, rendered as a row with date, title, time,
venue and a "View event" link. New events appear without editing the page.
Deploying requires the shared theme (0.1.4 or later) before the page artifact;
otherwise the list reports that the display pattern is unavailable.

```sh
npm run content:export -- brussels.fusion-circus.com --key events-calendar
npm run content:plan -- brussels.fusion-circus.com --key events-calendar
```
