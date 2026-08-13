# La Mutable theme instructions

These instructions apply to `sites/lamutable.es`. Also follow the platform
repository's root `AGENTS.md`.

## Read before changing code

- [README.md](README.md) for the project map and local commands.
- [design.md](design.md) before visual or layout work.
- [LANGUAGE-PATTERNS.md](lamutable/LANGUAGE-PATTERNS.md) when adding or
  changing localized patterns or template parts.
- [Platform import guide](../../docs/import-production.md) before importing
  production data.

## Architecture

- This is a custom block child theme of Twenty Twenty-Five.
- The theme directory is `lamutable/`; it is tracked directly, not a submodule.
- There is no bundler or build step.
- `lamutable/theme.json` is the canonical source for design tokens and default
  styles. `design.md` records the rationale and locked decisions.
- Reusable layout belongs in `lamutable/patterns/`. Templates and template
  parts stay thin and reference patterns.
- Use PHP only where WordPress evaluates it; keep orchestration in the
  platform's JavaScript tooling.

## Theme rules

- Use presets from `theme.json` in patterns, templates, and CSS. Do not add raw
  hex colors or raw pixel values there. Add a missing token first.
- Use `home_url()` and `get_theme_file_uri()` for internal URLs and assets.
- Escape output with the appropriate WordPress function and use the
  `lamutable` text domain for translatable strings.
- Keep `parts/` and `templates/` flat; WordPress ignores nested template parts.
- Preserve the child-theme relationship declared by `Template:
  twentytwentyfive` in `style.css`.
- Do not put design-review metadata or Hallmark critique comments in emitted
  block markup; they can break WordPress block parsing.
- Keep language variants structurally synchronized according to
  [LANGUAGE-PATTERNS.md](lamutable/LANGUAGE-PATTERNS.md).

## Development and verification

- Use the repository-level lifecycle and import commands documented in
  [README.md](README.md).
- Run `npm test` from the platform root.
- Validate changed PHP and JSON before rendering.
- Check the frontend and Site Editor at desktop and approximately 375 px;
  chrome must also work at 320 px without horizontal scrolling.
- If a file edit appears to have no effect, check for Site Editor database
  customizations, a selected style variation, an invalid `theme.json`, or a
  stale pattern cache. `WP_DEVELOPMENT_MODE` must remain set to `theme` in
  `.wp-env.json`.
- Record new or changed visual decisions in [design.md](design.md).

## Definition of done

- The change works on the frontend and in the Site Editor.
- Desktop and mobile layouts render without horizontal overflow.
- No untracked design values were introduced.
- All relevant language variants were reviewed.
- Relevant syntax checks and `npm test` pass.
- New configuration, commands, risks, or design decisions are documented in
  the appropriate canonical file linked above.
