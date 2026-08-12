---
name: plan-ticket
description: Investigate a Circus Site Platform GitHub issue, ground it in the current codebase, resolve implementation decisions with the user, and post an approved implementation plan as an issue comment. Use when asked to plan a ticket or prepare an issue for implementation from an issue number or URL.
---

# Plan Ticket

Turn the referenced issue into a current, code-grounded implementation plan. Draft and confirm the plan before changing GitHub.

## Resolve the issue and ownership

Accept a bare issue number or issue URL. For a bare number, use `marcin-wosinek/circus-site-platform`.

Read the issue body and all discussion with `gh issue view <number> --comments`. Record its acceptance criteria, risks, dependencies, and open questions. Read `TICKETS.md` completely to understand why the issue describes behavior rather than implementation.

Confirm the owning repository before planning. Inspect `sites.json`, `.gitmodules`, and relevant site documentation: shared capabilities and directly tracked sites belong to this repository, while a submodule normally has its own repository, instructions, issue tracker, and pull request. Stop and ask if the issue and code ownership do not match or remain ambiguous.

Planning is read-only apart from the final approved issue comment. Never write to production or change implementation files while planning.

## Ground the plan

Read the root `AGENTS.md`, the nearest site-level `AGENTS.md`, and relevant repository documentation. For a submodule, also read its own instructions and work against its current checkout.

Inspect the real implementation deeply enough to identify:

- Current behavior and the entry points the change affects.
- Exact files, modules, WordPress hooks, blocks, commands, schemas, or configuration involved.
- Existing sibling patterns to extend or reuse.
- Data flow, boundaries, error handling, and destructive safeguards.
- Tests, fixtures, local environments, documentation, and generated artifacts affected.
- Compatibility, accessibility, responsive, internationalization, performance, security, credential, production, interruption, and rerun concerns that apply.

Do not invent future architecture. Prefer the smallest JavaScript-first approach supported by current conventions, using PHP only where behavior must run inside WordPress. Keep shared capability separate from site-specific data and configuration.

## Resolve open forks

Re-evaluate every open question from the issue against the current code. Drop questions already answered by repository evidence. Add material decisions discovered during investigation, especially around scope, ownership, data, safety, compatibility, or user-visible behavior.

For each unresolved fork, present:

- The recommended option and rationale.
- The viable alternative and its tradeoff.
- The effect of the choice on scope or acceptance criteria.

Do not silently choose a material option.

## Draft the plan

Structure the plan in implementation order using only sections relevant to the work. Start the draft with the exact heading `## Implementation plan`, then include:

- **Context**: the intended outcome and important current behavior.
- **Decisions**: resolved choices and rationale; never leave questions here.
- **Implementation**: ordered, concrete steps with exact paths and the sibling patterns or APIs to follow.
- **Data and operations**: source, destination, direction, validation, confirmation, recovery, and idempotency where applicable.
- **Verification**: map tests and manual checks to the acceptance criteria and risks. Include root `npm test` for shared tooling, relevant site-local checks, local WordPress verification, and desktop/mobile/accessibility checks only when applicable.
- **Documentation**: configuration keys, environment variables, commands, or operational risks that must be documented.
- **Read first**: exact applicable instruction and reference paths, including root/site `AGENTS.md` and focused project documentation. Do not pad this list with unrelated files.

Use file paths and implementation identifiers here: code grounding is the purpose of the plan. Make each step specific enough that a later `$make-pr` session can implement it without rediscovering the intended design.

## Confirm before posting

Show the complete draft in chat and ask the user to decide every remaining fork. Do not post or modify the issue until the user explicitly approves the full plan. Incorporate feedback and present the complete revised plan again whenever it changes.

A plan is ready to post only when all decisions are recorded under **Decisions** and no open questions remain.

## Post the approved plan

Preserve the exact approved Markdown. Create a uniquely named temporary file with `mktemp`, write the plan to it, and post it with:

```sh
gh issue comment <number> --body-file <temporary-file>
```

Ensure `## Implementation plan` is the first line because `$make-pr` uses that heading to locate the specification. Remove the temporary file afterward. Do not add AI attribution.

Verify the posted comment and report its URL.
