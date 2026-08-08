# AGENTS.md

## Project summary

Circus Site Platform is a shared toolkit for building, inspecting, and
maintaining the WordPress websites managed by Circus IT. It will collect common
themes, plugins, blocks, patterns, automation, tests, and documentation while
allowing each website to keep its own content, configuration, and visual
identity.

This repository is at the beginning of its scaffolding phase. Keep early
changes small, explicit, and easy to revise as real workflows are brought in
from the existing websites.

## Technical direction

- Prefer modern JavaScript and Node.js for tooling, automation, integrations,
  configuration loading, validation, tests, and command-line interfaces.
- Use JavaScript modules rather than introducing another scripting language
  when Node.js can solve the task clearly.
- Use PHP where code must run inside WordPress, such as hooks, server-rendered
  blocks, plugins, or theme integration. Keep WordPress-specific PHP thin when
  orchestration can live in JavaScript.
- Prefer WordPress APIs and established WordPress packages over custom
  equivalents.
- Do not introduce a framework, package manager, monorepo tool, or build system
  until a concrete use case requires it. Once selected, document the choice and
  use it consistently.
- Design shared code around capabilities rather than around one particular
  website. Put website-specific values in data or configuration.

## Planned architecture

The platform is expected to grow incrementally to include:

1. A machine-readable registry describing the websites managed by the
   platform.
2. Integrations that retrieve site data and configuration from production
   servers for local use.
3. Reusable WordPress themes, plugins, blocks, and patterns.
4. JavaScript-based commands for setup, synchronization, migration, preview,
   testing, deployment, and maintenance.
5. Documentation and agent workflows for repeatable site operations.

Do not assume the future registry format, authentication mechanism, hosting
provider, or directory structure until those decisions are added to the
repository.

Site projects normally live under `sites/`. Existing independent projects may
be Git submodules, while platform-owned sites such as `sites/circus-it.eu` are
tracked directly in this repository. Check `.gitmodules` instead of assuming a
registered site is a submodule.

## Development guidelines

- Treat production systems as read-only unless a task explicitly authorizes a
  write operation.
- Never commit credentials, application passwords, private keys, production
  exports, or other secrets. Read credentials from environment variables or
  ignored local files.
- Keep production data out of version control. Prefer repeatable import and
  sanitization scripts over committed snapshots.
- Make synchronization operations explicit about their source, destination,
  and direction. Destructive operations must require confirmation or a clearly
  named opt-in flag.
- Validate external data at the boundary and report failures with the website
  and operation that caused them.
- Prefer deterministic, idempotent commands so interrupted operations can be
  rerun safely.
- Keep modules focused and favor clear data flow over hidden global state.
- Add tests for shared behavior and for parsers, adapters, migrations, and
  destructive safeguards.
- Update the README and this file when architectural decisions or standard
  developer commands are introduced.

## Working in this repository

Before changing code, inspect the repository for existing conventions and use
its documented commands. Avoid generating broad scaffolding that is unrelated
to the current task.

For each change:

1. Keep the scope narrow and preserve unrelated work.
2. Prefer the smallest JavaScript-first implementation that leaves room for
   additional websites and integrations.
3. Run the relevant formatter, linter, tests, and build once those tools exist.
4. Document new configuration keys, environment variables, commands, and
   operational risks.

At present, the repository has no established install, build, lint, or test
command. Add those instructions here when the initial JavaScript tooling is
introduced.
