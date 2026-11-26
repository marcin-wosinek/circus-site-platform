# Las Musas

- Production URL is https://las-musas.es.
- Local WordPress runs at http://localhost:9797.
- The local environment uses the tracked `las-musas` theme, a block child theme
  of Twenty Twenty-Five. There is no build step: WordPress consumes the PHP
  patterns, HTML template parts, CSS, and `theme.json` directly.
- SSH settings belong in the ignored root file `.env.import-local/las-musas.es`.
  See [the credential example](.env.import-local.example).

Run these commands from the repository root:

```sh
npm run bootstrap -- las-musas.es --apply
npm run start -- las-musas.es
npm run stop -- las-musas.es
npm run update -- las-musas.es
```

Bootstrap reads production and replaces the local database and uploads.

The database and uploads import succeeds. Bootstrap currently stops during
plugin mounting because the generated WordPress.org download URLs for
`hostinger-ai-assistant` and `hostinger-easy-onboarding` return HTTP 404.
Completing bootstrap requires valid local sources for those plugins or a
site-specific decision to omit them from the local environment.

## Managed content

`content-publish.json` tracks two pages. Export them with
`npm run content:export -- las-musas.es [--key <key>]`:

- `homepage`: the `/las-musas/` page. Production does not have a static
  front page yet (Settings → Reading shows latest posts), so the page is
  matched by its path rather than `page_on_front`.
- `quien-soy`: the `/quien-soy/` about page.

## Theme

Production still runs Twenty Twenty-Five. The import preflight requires the
production theme to match `.wp-env.json`, so `pull`/`import` refuse to run
until the `las-musas` theme is installed and activated on production. Theme
files are mounted live; if the theme is not active locally, run:

```sh
(cd sites/las-musas.es && npx wp-env run cli wp theme activate las-musas)
```

```text
las-musas/
├── parts/        Thin template parts that reference patterns
├── patterns/     Reusable, translatable layout source (Spanish)
├── functions.php Theme integration
├── style.css     Theme metadata and shared CSS
└── theme.json    Theme settings; design tokens inherit Twenty Twenty-Five
```

Visual direction is pending; there is no brand kit under `brand/` yet. Page
templates come from Twenty Twenty-Five and pick up the child header and footer
parts by slug. The root theme packaging workflow builds `las-musas.zip`;
deployment to production is a separate, manual step.
