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
npm run import -- circus-it.eu --apply
```

`start`, `stop`, and `update` run `wp-env` in the folder registered for the
site. `update` is shorthand for `wp-env start --update`.

Use these root commands instead of invoking `wp-env` directly. Before starting
or updating a site, the shared command generates an ignored
`.wp-env.override.json` that maps versioned Fair plugin releases to the local,
ignored `.wp-env-plugins/` cache. The tracked `.wp-env.json` remains the
canonical environment configuration.

The import command is destructive only to the selected local wp-env instance
and requires `--apply`. Production is read-only. Put each site's SSH settings
in the ignored `.env.import-local/<site-id>` file; a site-local
`.env.import-local` remains supported for compatibility. See
[`docs/import-production.md`](docs/import-production.md) for prerequisites,
configuration, safeguards, and recovery details.

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

The platform supports projects including:

- [acro-agenda.es](https://acro-agenda.es/)
- [acroyoga-club.es](https://acroyoga-club.es/)
- [circus-it.eu](https://circus-it.eu/)
- [fusion-circus.com](https://fusion-circus.com/)
- [lamutable.es](https://lamutable.es/)

## Status

Early development. The architecture and public interfaces will evolve as shared
workflows are extracted from existing projects.
