# brussels.fusion-circus.com

Production: <https://brussels.fusion-circus.com/>

This website is tracked directly in the platform repository. Local WordPress
runs at <http://localhost:9794> and mounts the shared Fusion Circus theme
from the `sites/fusion-circus` submodule. Initialize it before starting:

```sh
git submodule update --init --recursive
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
changes in the shared submodule affect every local site using that source.
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
