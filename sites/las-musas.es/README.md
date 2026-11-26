# Las Musas

- Production URL is https://las-musas.es.
- Local WordPress runs at http://localhost:9797.
- The local environment downloads Twenty Twenty-Five from WordPress.org.
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
