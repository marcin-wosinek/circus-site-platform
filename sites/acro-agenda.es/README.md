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

The site runs locally with `wp-env` on <http://localhost:9788>. From the
platform root, start it with:

```sh
npm run start -- acro-agenda.es
```

## Import production content

Create the ignored platform-root `.env.import-local/acro-agenda.es` file with
the site's SSH connection details, then run:

```sh
npm run import -- acro-agenda.es --apply
```

The repository theme is not replaced by an import. See
[`../../docs/import-production.md`](../../docs/import-production.md) for the
shared workflow, prerequisites, safeguards, and configuration keys.

## Screenshots

Install the site-level development dependencies and run the screenshot command
from this directory:

```sh
npm ci
npm run screenshot
```
