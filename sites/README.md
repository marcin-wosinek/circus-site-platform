# Sites

This directory contains the WordPress site projects managed by the platform.
Each project is kept as a Git submodule so it retains its own repository and
history while the platform pins the version it uses.

## Included sites

| Site ID | Folder | Local port | Source repository |
| --- | --- | ---: | --- |
| `acro-agenda.es` | `sites/acro-agenda.es` | 9788 | [marcin-wosinek/acro-agenda.es](https://github.com/marcin-wosinek/acro-agenda.es) |
| `fusion-circus` | `sites/fusion-circus` | 9789 | [marcin-wosinek/fusion-circus-theme](https://github.com/marcin-wosinek/fusion-circus-theme) |
| `lamutable.es` | `sites/lamutable.es` | 9790 | [marcin-wosinek/lamutable.es](https://github.com/marcin-wosinek/lamutable.es) |

After cloning the platform, initialize the site repositories with:

```sh
git submodule update --init --recursive
```

## Registry

The root [`sites.json`](../sites.json) file is the machine-readable site
registry. Each entry is keyed by a stable site ID and currently requires:

- `folder`: repository-relative path to the site's submodule directory. Paths
  must remain inside `sites/`.
- `port`: local HTTP port assigned to the site. Ports must not be reused by
  another entry.

The registry is validated by [`schemas/sites.schema.json`](../schemas/sites.schema.json).
JSON Schema validates the shape and range of individual values; automation
loading the registry must additionally reject duplicate folders and ports and
verify that every folder exists.

Site-specific WordPress configuration, themes, content, and scripts remain in
their site repository. Cross-site commands and shared orchestration belong in
the platform repository.
