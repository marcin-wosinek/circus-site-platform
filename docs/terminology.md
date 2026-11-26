# Terminology

> **Deprecated.** Copy is no longer written in this repository; the glossaries
> here serve existing campaign editions only. Site copy now comes from the
> client or from the private `event-content-studio` repository. Keep this
> material as read-only reference for existing work until it moves there; do
> not start new work from it.

Authors and agents use the approved wording in a glossary when they write
copy, translate it, or prepare text for images. There are two layers:

- the **shared glossary**, [`terminology.json`](../terminology.json), for
  terminology that applies across projects;
- an optional **project glossary**, `sites/<site-id>/brand/terminology.json`,
  next to that project's [brand kit](brand-kits.md).

The merged result for one project and one language is its **effective
glossary**. Consult it together with the brand kit: the brand kit governs voice
and expression, and the glossary fixes the words used for specific concepts.
Explicit task instructions still take precedence; record any deviation.

The structure is described by
[`schemas/terminology.schema.json`](../schemas/terminology.schema.json). The
commands below perform the full validation.

## Format

```json
{
  "$schema": "./schemas/terminology.schema.json",
  "formatVersion": 1,
  "concepts": {
    "contact-improvisation": {
      "context": "The movement practice and its classes, jams and workshops.",
      "sources": ["https://github.com/marcin-wosinek/circus-site-platform/issues/20"],
      "languages": {
        "es": {
          "preferred": "Contact improvisación",
          "discouraged": ["Improvisación de contacto"]
        }
      }
    }
  }
}
```

- **Concept IDs** are stable, lowercase kebab-case keys. Keep them unchanged
  when the wording changes.
- **`context`** (required) explains where and how the concept applies, so
  authors can tell a relevant use from an unrelated one.
- **`sources`** (required, at least one) are URLs or document references that
  support the wording.
- **`languages`** maps a language code (`es`, `en`, `pt-BR`) to an entry with
  the `preferred` wording and an optional list of `discouraged` variants. An
  entry may add its own `sources`. Language codes are matched exactly: `es-ES`
  never falls back to `es`.
- **`invariant`** declares a do-not-translate name, such as a project or
  association name. It is the approved wording in every language. Language
  entries of an invariant concept may only list `discouraged` variants (for
  example, a known mistranslation); they cannot set `preferred`.

Add only evidenced wording, and cite the evidence in `sources`. Do not add a
translation to make the glossary look complete.

## Precedence

1. Shared concepts apply to every project.
2. A project may **add** concepts with new IDs, which apply only to it.
3. A project may **add a language** to a shared concept that has no entry for
   that language.
4. A project may **override** a shared concept's entry for one language. The
   project entry must declare `"override": true` and replaces the shared entry
   for that language as a unit: its `preferred` and `discouraged` lists are not
   merged with the shared ones.

```json
{
  "formatVersion": 1,
  "concepts": {
    "contact-improvisation": {
      "languages": {
        "es": {
          "override": true,
          "preferred": "…",
          "discouraged": ["Improvisación de contacto"],
          "sources": ["Project decision record"]
        }
      }
    }
  }
}
```

An override leaves the concept's other languages, its `context`, `sources`,
and `invariant`, and every other shared concept unchanged. A project entry for
a shared concept may contain only `languages`. Project-specific wording
belongs in the project glossary, never in the shared file or in shared skills.

## Commands

Both commands are read-only and work offline. They need no credentials and
never contact WordPress or production. Copy files are never modified.

```sh
npm run terminology:show -- --site <site-id> --language <language> [--concept <id> ...]
npm run terminology:check -- --site <site-id> --language <language> [--concept <id> ...] <file> ...
```

`--site` names a folder under `sites/`. Registration in `sites.json` is not
required, so brand-only projects can have a glossary. A missing project
glossary is allowed; one that exists but is invalid stops both commands.
Relative file paths are resolved from the directory where `npm run` was
invoked.

**`show`** prints the effective glossary for the language: the preferred
wording or do-not-translate name, discouraged variants, context, references,
and provenance (the file that defined the concept, the file that supplied the
language entry, and which shared entry an override replaced). Concepts without
an approved entry for the language are listed as missing. With `--concept`,
only those concepts are shown, and a missing one makes the command exit with
`1`.

**`check`** scans the given UTF-8 text files against every discouraged variant
in the effective glossary for the language. Each finding reports the file,
line, column, concept, matched text, the file that supplied the entry, the
preferred replacement, and the surrounding line(s):

```text
copy.txt:2:9: discouraged "IMPROVISACIÓN DE CONTACTO" (concept "contact-improvisation", terminology.json); preferred: "Contact improvisación"
  context: TALLER: IMPROVISACIÓN DE CONTACTO
```

Pass `--concept` for each concept the copy is expected to mention. A requested
concept with no approved wording in the language is reported as a missing
translation for review, rather than having a translation invented. Concept use
is not inferred from prose.

Exit codes:

| Code | Meaning |
| --- | --- |
| `0` | No findings and no missing requested translations. |
| `1` | Discouraged wording found or a requested translation is missing. |
| `2` | Invalid arguments, input files, project path, or glossary data. |

Plain text, Markdown, captions, alt text, and hand-copied image lettering can be
checked directly. HTML, SVG and JSON files are scanned as plain text: markup
between words (`IMPROVISACIÓN DE</tspan><tspan>CONTACTO`) prevents a match, so
check image lettering as the words appear, one text per line or file.
Directories are not scanned recursively.

## Matching

- Text and terms are normalized to Unicode NFC and compared case-insensitively,
  so lowercase, title case, and uppercase presentation (`IMPROVISACIÓN DE
  CONTACTO`) are all found.
- Accents are significant: `Improvisacion` (without an accent) is a different
  spelling and is not reported.
- Matches are whole words, bounded by Unicode letters, digits and combining
  marks. `contactos` does not match `contacto`.
- Any run of whitespace, including a line break, matches a space in a term, so
  text wrapped across lines is still found. The finding points at its start.
- Line and column numbers count Unicode code points in the original file.
- When several variants of one concept overlap, the longest match is reported.

## Validation

The commands reject, with the file, concept and language involved:

- duplicate JSON keys, invalid JSON or UTF-8, unsupported fields, and a
  `formatVersion` other than `1`;
- malformed concept IDs or language codes, and empty, multi-line or padded
  terms;
- a new concept without `context` or `sources`, or without any language entry
  or invariant name;
- a discouraged variant that equals, or occurs inside, the preferred wording of
  the same entry, or that is listed twice;
- in the effective glossary, a discouraged variant that occurs inside another
  concept's approved wording in the same language, or that two concepts both
  discourage;
- a project entry replacing a shared entry without `"override": true`,
  `"override": true` without a shared entry to replace, and an `override`
  value other than `true`;
- a project concept changing a shared concept's `context`, `sources` or
  `invariant`.

All problems in a glossary are reported together.

## Limits and review

A clean result means only that no listed discouraged variant was found. It does
not establish that the copy is semantically correct, and it does not approve
wording that is not in the glossary. Ambiguous terms can produce false
positives. Review every finding in context before changing copy:

- leave quotations, names of other organizations, and titles of external works
  as they are when quoting them accurately;
- leave unrelated uses of the same words unchanged;
- the checker cannot detect an arbitrary invented translation of a
  do-not-translate name; authors must use the name as listed.

## Workflow

1. Before writing or translating copy, read the project's brand kit and run
   `terminology:show` for the project and language.
2. Write the copy using the preferred wording. Flag missing translations for
   review rather than presenting a new translation as approved.
3. Before rendering or exporting, run `terminology:check` on the final copy,
   captions, alt text, and the exact text that will be lettered on images.
4. After rendering, inspect the exact wording in the final image: uppercase
   presentation, line wrapping, accents, and clipping. The checker cannot see
   rendered images.
