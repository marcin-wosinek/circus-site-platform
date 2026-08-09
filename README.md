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

The import command is destructive only to the selected local wp-env instance
and requires `--apply`. Production is read-only. Put each site's SSH settings
in the ignored `.env.import-local/<site-id>` file; a site-local
`.env.import-local` remains supported for compatibility. See
[`sites/circus-it.eu/.env.import-local.example`](sites/circus-it.eu/.env.import-local.example)
for the available settings.

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
