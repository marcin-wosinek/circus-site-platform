---
name: make-pr
description: Implement a Circus Site Platform GitHub issue, or one specific issue comment, on a dedicated branch and open a focused pull request. Use when asked to make, prepare, or open a PR from an issue number, issue URL, or issue-comment URL.
---

# Make PR

Implement the referenced work in its owning repository, verify it, and open a pull request.

## Resolve the target and ownership

Accept a bare issue number, an issue URL, or an issue-comment URL. For a bare number, use `marcin-wosinek/circus-site-platform`.

Read the issue and discussion with `gh issue view <number> --comments`. For a comment URL, fetch the exact comment with `gh api repos/{owner}/{repo}/issues/comments/<comment-id>` and treat that comment as the specification; use the rest of the issue only as context.

For a whole issue, use a discussion comment headed `## Implementation plan` as the specification when one exists; otherwise use the issue body. Follow its read-first material and recorded decisions. Compare any plan with the current repository before implementing and report material drift.

Confirm that the issue belongs to the code being changed. Read `TICKETS.md`, `sites.json`, and `.gitmodules` as relevant: shared capabilities and directly tracked sites belong to this repository, while a submodule normally has its own issue tracker and pull request. Stop and ask if ownership is inconsistent or ambiguous.

If the specification leaves a material scope, ownership, safety, or design decision unresolved, stop and ask the user. After they decide, preserve the decision in a new issue comment:

```sh
gh issue comment <number> --body $'## Decision\n\n<decision and rationale>'
```

Do not edit an older plan comment to record a later decision.

## Prepare a branch

Inspect the worktree before changing branches and preserve unrelated user work. Never implement on `main`. When safe, update local `main` from `origin` with a fast-forward-only pull, then create a short descriptive branch named `<slug>-<issue-number>`. If local changes or branch divergence make that unsafe, stop and explain the conflict instead of stashing, resetting, or overwriting work.

## Implement

Read the root `AGENTS.md` and the nearest site-level `AGENTS.md` before editing. Inspect current documentation and sibling implementations, including a site's own repository instructions when working inside a submodule.

Keep the change narrow and JavaScript-first unless code must run inside WordPress. Keep site-specific values in configuration, validate external data at boundaries, and preserve deterministic and idempotent operation. Treat production as read-only unless the issue explicitly authorizes a production write. Never commit credentials, production exports, ignored environment files, generated local overrides, or other secrets.

Do not assume an unrecorded registry shape, authentication mechanism, hosting provider, directory layout, framework, package manager, monorepo tool, or build system.

## Verify

Use the repository's documented commands and report every result honestly:

- Run the root `npm test` suite for shared tooling changes.
- Run relevant site-local tests, formatters, linters, and builds when that site defines them.
- Exercise WordPress behavior in the affected local environment using the root `npm run start -- <site-id>` workflow when practical.
- Check user-facing changes at representative desktop and mobile sizes, including keyboard and visible-focus behavior for interactive UI.
- Test validation failures, interruption, and safe reruns for operational workflows when relevant.
- Recheck the issue's acceptance criteria and identified risks.

Do not write to production as verification unless the issue and user explicitly authorize it.

## Commit and open the pull request

Review the diff and staged files so unrelated or sensitive files are excluded. Follow the repository's existing commit style: use an imperative, concise subject and explain the reason in the body when it is not obvious. Do not add AI attribution.

Put `Closes #<number>` on its own line in the commit body and PR summary when the PR completes the whole issue. Use `Refs #<number>` when implementing only one comment or a bounded part of a larger issue.

Push the topic branch and open the PR with `gh pr create`. Write the PR body to a uniquely named temporary file and pass it with `--body-file`; remove the temporary file afterward. Include:

- Summary, including the issue link keyword.
- Changes made.
- Verification performed and its results.
- Each acceptance criterion and how it is met, or why it is explicitly deferred.
- Risks, limitations, and screenshots when applicable.

Verify the resulting PR and report its URL, branch, tests, and any deferred checks.
