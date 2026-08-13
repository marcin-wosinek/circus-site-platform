# Language-specific patterns

The theme keeps language variants as separate filesystem patterns. This makes
each language explicit, editable in WordPress, and independent of a runtime
translation mechanism.

See the site [documentation index](../README.md) for related development and
design guidance.

Spanish is the default language and uses the base name. Other languages add
their language code as a suffix:

| Language | File | Pattern slug |
| --- | --- | --- |
| Spanish | `patterns/<name>.php` | `lamutable/<name>` |
| English | `patterns/<name>-en.php` | `lamutable/<name>-en` |
| Another language | `patterns/<name>-<code>.php` | `lamutable/<name>-<code>` |

Use lowercase ISO 639-1 language codes such as `en`, `ca`, or `fr`. Keep the
same base name for variants of the same component or section.

## Pattern requirements

Each language variant must:

1. Have a unique `Title` and `Slug` in its PHP pattern header.
2. Contain copy and links for only one language.
3. Preserve the same structure, classes, design tokens, and responsive
   behaviour as its sibling variants unless a documented content difference
   requires otherwise.
4. Use WordPress escaping and the `lamutable` text domain.
5. Use `home_url()` for internal paths instead of hard-coding the domain.

Example pattern headers:

```php
/**
 * Title: Cabecera
 * Slug: lamutable/header
 */
```

```php
/**
 * Title: Header (English)
 * Slug: lamutable/header-en
 */
```

## Template parts

When a pattern represents a template part, create a matching file in `parts/`:

| Pattern | Template part |
| --- | --- |
| `patterns/<name>.php` | `parts/<name>.html` |
| `patterns/<name>-en.php` | `parts/<name>-en.html` |

The template part should remain thin and reference its pattern:

```html
<!-- wp:pattern {"slug":"lamutable/header-en"} /-->
```

Register each template part in `theme.json`, using the appropriate WordPress
area. A template can then select the required language explicitly:

```html
<!-- wp:template-part {"slug":"header-en","area":"header","tagName":"header"} /-->
```

Patterns that are embedded directly in a template do not need a template part
or a `theme.json` registration:

```html
<!-- wp:pattern {"slug":"lamutable/contact-en"} /-->
```

## Adding or changing variants

- Create every required language variant when adding a reusable pattern.
- When changing shared markup or styling, review and update all variants.
- Content-only changes may be made to one language without changing the
  others.
- Record intentional structural differences in [`design.md`](../design.md).
- Verify each variant on desktop and mobile.

The current headers demonstrate this convention:

- Spanish: `patterns/header.php` and `parts/header.html`
- English: `patterns/header-en.php` and `parts/header-en.html`
