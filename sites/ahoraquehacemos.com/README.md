# Ahora que hacemos

Planned production URL: https://ahoraquehacemos.com/

Local WordPress: http://localhost:9796/ (admin: http://localhost:9796/wp-admin/).
Default local credentials: `admin` / `password`.

This is a fresh local installation using the local
[Ahora que hacemos block theme](ahoraquehacemos/), with no additional plugins
or production content. The theme follows the draft
[brand kit](brand/README.md) version 0.1.0; it does not imply brand approval.

Run from the platform root:

```sh
npm run start -- ahoraquehacemos.com
npm run stop -- ahoraquehacemos.com
npm run update -- ahoraquehacemos.com
```

`start` creates the local installation on first use. The shared local email
safeguard is mounted automatically. Local uploads and import data are ignored.

The homepage is managed in `content-publish.json`. Its three-paragraph Spanish
introduction is exported to `content/pages/homepage/`. After editing the local
page, refresh the tracked artifact from the platform root:

```sh
npm run content:export -- ahoraquehacemos.com --key homepage
```

The shared `bootstrap` / `pull` commands import an existing production site;
they are not needed for this fresh installation. Production hosting, WordPress
path, and active theme have not been verified. Before enabling imports, follow
[Adding a managed website](../../docs/adding-sites.md), verify the production
theme matches the local configuration, and fill the ignored
`.env.import-local/ahoraquehacemos.com` using the provided example.

## Theme

The `ahoraquehacemos/` theme requires WordPress 6.7+ and PHP 7.4+ and has no
build step, external fonts, JavaScript, or plugin dependencies. `theme.json`
exposes the brand palette, system font stacks, spacing, and type scale in the
Site Editor. `style.css` supplies responsive layout and keyboard focus styles
and is loaded on the frontend and in the editors.

After starting the environment, activate the theme locally if needed:

```sh
cd sites/ahoraquehacemos.com
npx @wordpress/env run cli wp theme activate ahoraquehacemos
```

The front-page template contains the introduction headline, an anchor link to
upcoming encounters, and the brand kit's empty state. It renders the existing
homepage body through the Post Content block; that content remains managed by
`content-publish.json`. Edit theme sections in Appearance → Editor and page
copy in Pages. Site Editor overrides are stored in the local database and can
mask later file changes; clear the relevant template customization to return
to the version in Git. Theme templates are separate from content export.

Page, single, archive/index, and 404 templates share the header and footer.
Navigation points to the homepage sections. The provisional JPEG logo is not
used; the site title is the text identity. There are no invented event details,
booking links, or contact addresses. Add verified encounters and contact details
when supplied, replacing the empty state in the Site Editor or template.
Production has not been changed.
