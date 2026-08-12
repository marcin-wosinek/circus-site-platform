# Writing Tickets

How to turn a feature request, operational need, or maintenance finding into a
GitHub issue for Circus Site Platform. The goal is a ticket that fixes the
**intended behaviour, ownership, and risks** without prescribing an
implementation that may be stale by the time work begins.

Tickets deliberately contain **no direct code references**. Explore the
current implementation when drafting, but keep file paths, function and class
names, script internals, and other implementation identifiers out of the
issue. Code grounding belongs in planning, against the repository as it exists
then.

## Workflow

1. **Choose the owning repository.** Decide whether the request belongs to the
   shared platform or to one website:

   - Shared commands, the website registry, cross-site automation, shared
     WordPress capabilities, and platform documentation belong in
     `marcin-wosinek/circus-site-platform`.
   - A platform-owned site tracked directly in this repository also belongs in
     `marcin-wosinek/circus-site-platform`; name its site ID in the ticket.
   - A site maintained as a Git submodule belongs in that site's own repository.
     Check the repository's current site documentation and `.gitmodules`
     rather than assuming ownership from its folder location.
   - Work that genuinely crosses repositories should normally be split into
     independently shippable, linked tickets. State the dependency from the
     user's or operator's perspective.

2. **Explore to understand behaviour, not to cite code.** Read the relevant
   platform and site documentation, then inspect enough of the current system
   to describe what happens today and what should change. Naming a site, shared
   command, workflow, or user-facing feature is useful. Naming its implementing
   file, class, function, or internal identifier is not.

3. **Describe behaviour from the outside.** Identify the actor, their starting
   point, the action they take, the result they observe, and what happens on
   failure. Depending on the ticket, the actor may be a site visitor, editor,
   developer, or operator. For automation, make the source, destination, and
   direction explicit.

4. **Separate shared capability from site configuration.** Say which behaviour
   should work across registered sites and which values or presentation remain
   site-specific. Do not assume a future registry shape, authentication method,
   hosting provider, directory structure, framework, or build system unless an
   accepted project decision already establishes it.

5. **Call out risks and safeguards.** Consider production access, destructive
   local operations, credentials, external data validation, retries and
   idempotency, existing content compatibility, WordPress compatibility,
   accessibility, responsive behaviour, internationalization, performance,
   and recovery after interruption. Link durable project documentation instead
   of repeating it, such as [production imports](docs/import-production.md) or
   [repository merges](docs/merge-repository.md).

6. **Surface decisions as open questions.** When a real fork exists, give the
   recommended option and the reason for it, then name the viable alternative.
   Do not silently settle choices that materially affect scope, data, safety,
   or ownership. Omit the section when no decision remains.

7. **Draft before creating.** Present the proposed title, complete body, target
   repository, and labels for approval. Do not create or modify a GitHub issue
   until the user explicitly approves the draft.

8. **Create the approved issue.** Use `gh issue create` with a temporary body
   file so Markdown and checkboxes are preserved. Verify the resulting issue
   and report its URL. Scheduling is optional: do not assign a milestone,
   project, or sprint unless the request identifies one or this repository
   documents one.

## Title and labels

- Use an imperative, outcome-focused title. Add the site ID or shared platform
  context when it prevents ambiguity, for example: `Make production imports
  resumable for registered sites` or `Improve the circus-it.eu mobile header`.
- Inspect the labels in the **target repository** before proposing them. Apply
  only labels that genuinely fit; leaving a ticket unlabeled is better than
  forcing a misleading category.
- Do not copy label, project, iteration, or milestone conventions from another
  repository. Independent site repositories may use different workflows.

## Ticket structure

Use this skeleton and drop sections that do not apply:

- **Scope** — `Shared platform` or the affected site ID, plus whether the
  behaviour is cross-site or site-specific.
- **Summary** — what should change and why in two to four sentences. Name the
  existing workflow or feature it extends in behaviour terms.
- **Motivation** — the user, editor, developer, or operator problem worth
  solving.
- **Current behaviour** — the observable starting point, when it helps explain
  the gap.
- **Expected behaviour** — entry point, flow, outcome, failures, and meaningful
  edge cases from the actor's perspective.
- **Risks and safeguards** — production, data, security, compatibility,
  accessibility, responsive behaviour, internationalization, performance, and
  recovery concerns that could be underestimated. Link stable documentation.
- **Open questions** — genuine forks, each with a recommendation and rationale.
- **Acceptance criteria** — a `- [ ]` checklist of observable outcomes and the
  proportionate verification required.
- **Dependencies** — linked external or cross-repository outcomes that must
  land before or alongside this work.

## Acceptance criteria guidance

Acceptance criteria should describe evidence that the behaviour works, not how
to implement it. Include the relevant levels of verification:

- Shared JavaScript behaviour and safety checks are covered by the
  repository-wide `npm test` suite.
- WordPress behaviour is verified in the affected site's local environment.
- User-facing changes are checked at representative desktop and mobile
  viewports, including keyboard use and visible focus where interactive.
- Operational workflows cover success, validation failure, interruption, and
  safe reruns where those states apply.
- Production remains read-only unless the ticket explicitly authorizes a
  production write and defines its safeguards.

Do not add every item mechanically. Select the checks needed to prove the
ticket's observable behaviour and protect its identified risks.

## Principles

- **Durable beats precise-today.** Behaviour and constraints survive
  refactors; implementation coordinates often do not.
- **Ownership before implementation.** Put the issue where the affected
  capability is maintained, especially when a site is a submodule.
- **Shared capabilities, site-specific data.** Reuse behaviour across sites
  without erasing their content, configuration, or visual identity.
- **Safe operations are part of the behaviour.** Sources, destinations,
  direction, confirmation, recovery, and rerun semantics are acceptance-level
  concerns for synchronization and migration work.
- **Specific beats exhaustive.** Pin down the decisive behaviours and risks;
  link documentation for established rules.
- **Write for future planning.** Give the planner intent, boundaries, and
  evidence to seek, not implementation directions that may have moved.
