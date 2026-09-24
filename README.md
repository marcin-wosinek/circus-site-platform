# Circus Site Platform

Shared WordPress tooling for building and maintaining websites managed by
[Circus IT](https://circus-it.eu/).

The platform brings reusable themes, plugins, block patterns, scripts, agent
skills, and development workflows into one place. Its goal is to reduce
duplicated work while allowing each website to retain its own identity.

## Commands

Run shared site operations from the repository root. The `--` forwards the
site ID and any additional options through npm:

```sh
npm run start -- circus-it.eu
npm run stop -- circus-it.eu
npm run update -- circus-it.eu
npm run pull -- circus-it.eu --apply
npm run bootstrap -- circus-it.eu --apply
npm run import -- circus-it.eu --apply
```

`start`, `stop`, and `update` run `wp-env` in the folder registered for the
site. `update` is shorthand for `wp-env start --update`.

`pull` runs the complete production-to-local workflow for a registered site,
whether the local environment is new or already exists. It preflights the
production connection and theme, starts local WordPress without production
plugins, imports the database and uploads, updates the plugin mounts, and
verifies the resulting site. `bootstrap` is an alias for the same workflow.
If the ignored production credentials file is missing, the first run copies the site's
`.env.import-local.example` to `.env.import-local/<site-id>` and stops so the
credentials can be filled in. When a site has no example, it creates a generic
SSH template instead. Run it again with `--apply` to complete the pull.
Deferring plugin activation until after the database import avoids
running production plugin migrations against an empty first-start database.
Creating the credentials template is reported as an incomplete pull, not
as success. Before changing the local environment, pull checks production
access and confirms that the configured theme matches production. It finishes
by comparing key site identity, front-page, theme, and page-count values with
production so a pristine or partial local install cannot be reported as done.
Like `import`, it requires the explicit flag before replacing local data and
never writes to production.

Use these root commands instead of invoking `wp-env` directly. Before starting
or updating a site, the shared command generates an ignored
`.wp-env.override.json` that maps versioned Fair plugin releases to the local,
ignored `.wp-env-plugins/` cache. The override also mounts a platform-owned
must-use plugin that prevents every managed local WordPress environment from
sending email through `wp_mail()`. The tracked `.wp-env.json` remains the
canonical environment configuration, and production is unaffected. Because
the safeguard is mounted from the filesystem rather than stored in WordPress's
database, importing production data cannot disable it.

The import command is destructive only to the selected local wp-env instance
and requires `--apply`. Production is read-only. Put each site's SSH settings
in the ignored `.env.import-local/<site-id>` file; a site-local
`.env.import-local` remains supported for compatibility. See
[`docs/import-production.md`](docs/import-production.md) for prerequisites,
configuration, safeguards, and recovery details.

## Content publishing

For sites with a `content-publish.json` configuration, export the configured
item's local `wp-env` state into a committed, deterministic artifact, then
plan its deployment by comparing the artifact against current production
state (read-only):

```sh
npm run content:export -- <site-id> [--key <content-key>]
npm run content:plan -- <site-id> [--key <content-key>]
npm run content:apply -- <site-id> --plan .content-publish/plans/<site-id>/plan.json --confirm-production=<site-id>
```

This is distinct from production import: import copies an entire site
one-way from production into local `wp-env`, while content publishing manages
one explicitly configured item at a time, with the committed artifact as its
source of truth. Apply writes only a reviewed saved plan after verifying the
destination, current production state, and a fresh full database backup. See
[`docs/publish-content.md`](docs/publish-content.md).

## Theme artifacts

The root [theme packaging workflow](.github/workflows/build-themes.yml) builds
the directly tracked `acro-agenda` and `circus-it` themes. Its matrix is the
authoritative list of packaged themes; `sites.json` remains focused on site
operations.

Run the workflow manually, or let a push to `main` trigger it when the workflow
or either configured theme changes. Documentation-only and unrelated changes
do not trigger packaging. The workflow checks out submodules recursively, but
review repository ownership before adding a submodule theme because
independently maintained themes normally belong in their own repository.

Successful runs publish one GitHub Actions artifact named
`wordpress-themes`. GitHub downloads it as `wordpress-themes.zip`, containing:

```text
wordpress-themes.zip
├── acro-agenda.zip
└── circus-it.zip
```

Each inner ZIP is independently installable in WordPress and contains exactly
one top-level directory matching its theme slug. Packaging fails when a source
path is missing, empty, outside `sites/`, or lacks a readable `style.css` with
a `Theme Name` header. It also rejects empty archives, unsafe paths, unexpected
top-level entries, and repository-only metadata such as `.git`, `.github`, and
`.DS_Store`.

This workflow only turns committed source files into downloadable artifacts.
It has no deployment step, production access, credentials, or production
writes.

## Planned scope

- Shared WordPress development workflows
- Reusable blocks, patterns, and theme foundations
- Content creation and migration tools
- Production data imports for local development
- Theme and content previews
- Testing, deployment, and maintenance scripts
- Agent skills and project documentation

## Websites

See [Adding a managed website](docs/adding-sites.md) for the complete registry,
local WordPress, and import setup workflow.

The platform supports projects including:

- [acro-agenda.es](https://acro-agenda.es/)
- [acroyoga-club.es](https://acroyoga-club.es/)
- [brussels.fusion-circus.com](https://brussels.fusion-circus.com/)
- [circus-it.eu](https://circus-it.eu/)
- [fair-event-plugins.com](https://fair-event-plugins.com/)
- [fusion-circus.com](https://fusion-circus.com/)
- [lamutable.es](https://lamutable.es/)
- [valencia.fusion-circus.com](https://valencia.fusion-circus.com/)

## Status

Early development. The architecture and public interfaces will evolve as shared
workflows are extracted from existing projects.
