# circus-it.eu

The Circus IT website lives directly in the platform repository. It is not a
Git submodule.

The local clone uses Blockbase, matching the active production theme. The
`circus-it` directory is a minimal standalone WordPress block theme. It has
no build step or third-party runtime dependencies; the homepage is composed
from native WordPress blocks so it can evolve alongside the platform's
automation. It is retained for development and is not used by the local clone.

## Retained development theme

- Theme directory: `circus-it`
- Minimum WordPress version: 6.7
- Minimum PHP version: 7.4
- Text domain: `circus-it`

## Local WordPress

The site runs locally with `wp-env` on <http://localhost:9791>. From the
platform root, start it with:

```sh
npm run start -- circus-it.eu
```

## Import production content

Use `.env.import-local.example` as a template for the platform-root
`.env.import-local/circus-it.eu` file and set the Hostinger SSH target, port,
and absolute WordPress path. Set `PRODUCTION_SSH_KEY` too if the key is not
selected through your SSH configuration. Ensure SSH key authentication works
and that `wp` and `mysqldump` are available on the remote server.

```sh
npm run import -- circus-it.eu --apply
```

The import verifies that production uses Blockbase and activates it locally.
Production templates and styles stored in the database are imported with the
content. The retained `circus-it` theme files are not replaced by an import. See
[`../../docs/import-production.md`](../../docs/import-production.md) for the
shared workflow, safeguards, configuration keys, and local credentials.

## Event Kit landing page

The Spanish landing page lives at `/event-kit/`. Its editable core blocks and
Fair Form signup are managed as the `event-kit` content key in
`content-publish.json`, with the export under `content/pages/event-kit/`.
The retained development theme is not required.

Fair Form must be installed and active on production before publishing. The
form is identified as `event-kit-testing-updates` and collects a required email
and explicit consent to Event Kit updates, plus optional name and event type.
Submissions use Fair Form's storage; this page does not configure an automated
mailing campaign or send updates. The plugin is intentionally not added to the
local wp-env configuration: without it, local previews omit the form.

After editing locally, run `npm run content:export -- circus-it.eu --key event-kit`,
review and commit the artifact, then follow `docs/publish-content.md` to plan
and apply only this page. Do not pull production again before exporting local
edits: a pull replaces the local database.
