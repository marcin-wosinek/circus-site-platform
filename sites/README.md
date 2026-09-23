# Sites

This directory contains the WordPress site projects managed by the platform.
Most projects are kept as Git submodules so they retain their own repository
and history while the platform pins the version it uses. Sites that belong to
the platform itself can instead be tracked directly in this repository.

## Included sites

| Site ID | Folder | Local port | Source repository |
| --- | --- | ---: | --- |
| `acroyoga-club.es` | `sites/acroyoga-club.es` | 9793 | This repository |
| `acro-agenda.es` | `sites/acro-agenda.es` | 9788 | This repository |
| `brussels.fusion-circus.com` | `sites/brussels.fusion-circus.com` | 9794 | This repository |
| `circus-it.eu` | `sites/circus-it.eu` | 9791 | This repository |
| `fair-event-plugins.com` | `sites/fair-event-plugins.com` | 9792 | This repository |
| `fusion-circus` | `sites/fusion-circus` | 9789 | [marcin-wosinek/fusion-circus-theme](https://github.com/marcin-wosinek/fusion-circus-theme) |
| `lamutable.es` | `sites/lamutable.es` | 9790 | [marcin-wosinek/lamutable.es](https://github.com/marcin-wosinek/lamutable.es) |
| `valencia.fusion-circus.com` | `sites/valencia.fusion-circus.com` | 9795 | This repository |

Follow [Adding a managed website](../docs/adding-sites.md) when registering a
site, including its local WordPress configuration and import setup.

After cloning the platform, initialize the site repositories with:

```sh
git submodule update --init --recursive
```

## Registry

The root [`sites.json`](../sites.json) file is the machine-readable site
registry. Each entry is keyed by a stable site ID and currently requires:

- `folder`: repository-relative path to the site's project directory. Paths
  must remain inside `sites/`.
- `port`: local HTTP port assigned to the site. Ports must not be reused by
  another entry.
- `productionUrl`: canonical HTTPS URL used as the source URL during imports.

The registry is validated by [`schemas/sites.schema.json`](../schemas/sites.schema.json).
JSON Schema validates the shape and range of individual values; automation
loading the registry must additionally reject duplicate folders and ports and
verify that every folder exists.

Site-specific WordPress configuration, themes, content, and scripts remain in
their site directory. Cross-site commands and shared orchestration belong in
the platform repository.

## Shared commands

From the platform root, select a registered site with:

```sh
npm run start -- <site-id>
npm run stop -- <site-id>
npm run update -- <site-id>
npm run bootstrap -- <site-id> --apply
npm run import -- <site-id> --apply
```

Use `bootstrap` for initial setup: it prepares the ignored credentials file,
then starts wp-env without plugins, runs the production import, and mounts the
imported plugin set after credentials are filled in and `--apply` is supplied.
This prevents plugin migrations from running against an empty first-start
database.

For imports, the site's `.wp-env.json` must map `wp-content/uploads` and
`wp-content/import` to local directories and define exactly one theme source.
The command reads the default production URL and local port from the registry.
These can be overridden with `PRODUCTION_URL` and `LOCAL_URL` in
`.env.import-local/<site-id>` at the platform root.

See [`../docs/import-production.md`](../docs/import-production.md) for the
complete import workflow. Keep hosting details and other site-only prerequisites
in the README inside the relevant site directory.

## Content publishing

A site may additionally declare a `content-publish.json` file selecting a
small set of explicitly managed WordPress content items and where their
committed artifacts live. This is a separate capability from import: import
replaces an entire local site from production; content publishing manages one
configured item at a time, treating its committed artifact as the deployable
source of truth. Ownership boundary: shared validation, normalization, and
commands live in this repository under `scripts/lib/`; each site owns its own
`content-publish.json` selection and artifacts. See
[`../docs/publish-content.md`](../docs/publish-content.md) for the current
scope (export only) and the artifact format.
