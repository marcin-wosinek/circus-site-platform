# acro-agenda.es

The Acro Agenda website lives directly in the platform repository. It is not a
Git submodule.

The `acro-agenda` directory contains a WordPress block child theme of Twenty
Twenty-Five. The theme itself has no build step; the site-level Node.js tooling
is used to create screenshots.

## Theme

- Theme directory: `acro-agenda`
- Parent theme: `twentytwentyfive`
- Minimum WordPress version: 6.7
- Minimum PHP version: 7.4
- Text domain: `acro-agenda`

The visual direction and design tokens are documented in [`design.md`](design.md).

## Local WordPress

The site runs locally with `wp-env` on <http://localhost:9788>. Run all site
operations from the platform root so the registered site configuration and
shared safeguards are applied:

```sh
npm run start -- acro-agenda.es
npm run stop -- acro-agenda.es
npm run update -- acro-agenda.es
```

`update` starts the environment with refreshed WordPress and plugin sources.

## Import production content

The shared importer reads production over SSH and destructively replaces only
the Acro Agenda local `wp-env` database and uploads. Production remains
read-only. The tracked `acro-agenda` theme and the editorial HTML and Markdown
files in this directory are never replaced.

The import requires Docker, Node.js, SSH access to production, remote WP-CLI
and `mysqldump`, and a running local environment. Copy
`.env.import-local.example` to the ignored platform-root
`.env.import-local/acro-agenda.es` file and fill in the SSH values. Keep that
file, private keys, database exports, uploads, and logs containing production
context out of version control.

From the platform root, run:

```sh
npm run start -- acro-agenda.es
npm run import -- acro-agenda.es --apply
```

`--apply` is mandatory. Before replacing local data, the importer downloads and
validates the production snapshots. It stores the previous local database and
uploads under the ignored `sites/acro-agenda.es/import/` directory and prints
their exact recovery paths. Recovery is manual. Interrupted imports can be
rerun with the same command; each run creates timestamped backups before local
replacement.

See [`../../docs/import-production.md`](../../docs/import-production.md) for
the complete configuration reference, operation sequence, safeguards, and
recovery details.

### Production plugin sources

The active production plugins were audited on 2026-09-14. The shared importer
can reproduce all of them without a site-local plugin installer:

- `fair-audience`, `fair-audience-experimental`, `fair-events`,
  `fair-events-experimental`, and `fair-form` come from one coherent
  `marcin-wosinek/fair-event-plugins` GitHub release.
- `hostinger`, `plausible-analytics`, `plugin-check`, and `wp-mail-logging`
  use their matching WordPress.org plugin-directory downloads.

An import derives this list from production and updates `.wp-env.json`; run
`npm run update -- acro-agenda.es` afterward to apply changed plugin sources.
Importing does not create REST Application Passwords or write `.env.wp-rest`.
REST publishing credentials, if needed for a separate editorial workflow,
must be provisioned independently with the least privileges that workflow
requires.

## Content publishing

The homepage and `/valencia/` page are managed as committed artifacts under
[`content-publish.json`](content-publish.json), with content keys `homepage`
and `valencia`. Edit either page in the local block editor as usual, then
export both local states into their committed artifacts:

```sh
npm run content:export -- acro-agenda.es
```

Export reads only the local `wp-env`; production is untouched. Review the
artifact diff before committing. See
[`../../docs/publish-content.md`](../../docs/publish-content.md) for the
authoring workflow, the artifact format, and current scope — planning and
applying an artifact to production do not exist yet.

## Screenshots

Install the site-level development dependencies and run the screenshot command
from this directory:

```sh
npm ci
npm run screenshot
```
