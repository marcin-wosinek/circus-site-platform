# lamutable.es

La Mutable is a custom WordPress block child theme of Twenty Twenty-Five. It
lives directly in the Circus Site Platform repository and is developed with
wp-env. There is no build step: WordPress consumes the PHP patterns, HTML
templates, CSS, and `theme.json` directly.

## Documentation

| Document | Purpose |
| --- | --- |
| [README.md](README.md) | Project entry point, local commands, and documentation map |
| [AGENTS.md](AGENTS.md) | Implementation rules for coding agents and contributors |
| [design.md](design.md) | Locked visual decisions and rationale |
| [LANGUAGE-PATTERNS.md](lamutable/LANGUAGE-PATTERNS.md) | Convention for language-specific patterns and template parts |
| [Platform import guide](../../docs/import-production.md) | Shared production-to-local import workflow and safeguards |

`CLAUDE.md` exists only as a compatibility entry point and refers to
`AGENTS.md`; do not maintain a second copy of the instructions there.

## Requirements

- Node.js
- Docker Desktop
- The repository-level dependencies installed with `npm install`

## Local development

Run site operations from the platform repository root:

```sh
npm run start -- lamutable.es
npm run stop -- lamutable.es
npm run update -- lamutable.es
```

The development site runs at <http://localhost:9790>. The default wp-env login
is `admin` / `password`. Theme files are mounted live, so changes normally
require only a browser reload.

If the theme is not active, run wp-env from the site directory:

```sh
(cd sites/lamutable.es && npx wp-env run cli wp theme activate lamutable)
```

## Importing production content

The shared importer reads production over SSH and destructively replaces only
La Mutable's local `wp-env` database and uploads. Production remains read-only,
and the tracked `lamutable` theme is never replaced.

The import requires Docker, Node.js, SSH access to production, remote WP-CLI,
and `mysqldump`. Copy `.env.import-local.example` to the ignored platform-root
`.env.import-local/lamutable.es` file and fill in the SSH values. Keep that
file, private keys, database exports, uploads, and logs containing production
context out of version control.

From the platform root, run:

```sh
npm run start -- lamutable.es
npm run import -- lamutable.es --apply
```

`--apply` is mandatory. Before replacing local data, the importer downloads and
validates the production snapshots. It stores the previous local database and
uploads under the ignored `sites/lamutable.es/import/` directory, updates the
pinned plugin sources, reactivates the tracked theme, and prints the exact
recovery paths. Recovery is manual; interrupted imports can be rerun safely.

See the [platform import guide](../../docs/import-production.md) for the full
configuration reference, operation sequence, safeguards, and recovery details.

### Production plugin sources

An import derives the active plugin list from production. The `fair-*` suite is
resolved from one coherent `marcin-wosinek/fair-event-plugins` GitHub release;
other active plugins must have matching WordPress.org directory slugs. The
resolved URLs are written to `.wp-env.json`; run `npm run update -- lamutable.es`
afterward to apply a changed plugin list.

Importing does not create REST Application Passwords or write `.env.wp-rest`.
Publishing credentials for any separate editorial workflow must be provisioned
independently with the least privileges that workflow requires.

## Content sync

The WordPress front page, `/bart/` page,
`/fair-events/festival-de-conexion/` event, and
`/fair-events/minifesti-la-mutable-26-de-septiembre/` event are managed as committed artifacts
through [`content-publish.json`](content-publish.json). Edit them in the local
block editor, then export their local state from the platform root:

```sh
npm run content:export -- lamutable.es
```

The export reads only the local `wp-env`; production is untouched. Review the
artifact diff before committing. See the
[content publishing guide](../../docs/publish-content.md) for the artifact
format and current scope. Applying artifacts to production is not implemented.

## Theme structure

```text
lamutable/
├── assets/       Fonts and images
├── parts/        Thin template parts that reference patterns
├── patterns/     Reusable, translatable layout source
├── templates/    Full-page block templates
├── functions.php Theme integration
├── style.css     Theme metadata and shared CSS
└── theme.json    Canonical design tokens and default styles
```

Before changing theme code, read [AGENTS.md](AGENTS.md). For visual work, also
read [design.md](design.md). For localized patterns, follow
[LANGUAGE-PATTERNS.md](lamutable/LANGUAGE-PATTERNS.md).

## Verification

From the platform repository root:

```sh
npm test
```

Also validate affected PHP and JSON, then inspect the rendered result at
desktop and mobile widths. The complete definition of done and WordPress
block-theme caveats live in [AGENTS.md](AGENTS.md).
