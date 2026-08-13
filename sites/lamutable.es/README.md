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

Create the ignored platform-root `.env.import-local/lamutable.es` file, then
run:

```sh
npm run import -- lamutable.es --apply
```

Production is read-only. The command destructively replaces only La Mutable's
local wp-env database and uploads, preserves a local backup, updates pinned
plugin sources, and reactivates the tracked theme. See the
[platform import guide](../../docs/import-production.md) for requirements,
configuration, safeguards, and recovery.

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
