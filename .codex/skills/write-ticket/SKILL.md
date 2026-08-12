---
name: write-ticket
description: Draft, review, create, and schedule behaviour-focused GitHub issues for Fair Event Plugins. Use when asked to write, file, open, or create a ticket or GitHub issue, optionally targeting the current or next sprint.
---

# Write Ticket

Draft a behaviour-level issue, obtain explicit approval, then create it and add it to the requested Fair Event Plugins sprint.

## Interpret the request

- Treat a leading `current` or `next` as the sprint selector and remove it from the ticket topic.
- Treat the remaining text as the ticket topic.
- If neither sprint selector is present, ask the user to choose current or next when presenting the draft.
- Determine the target issue repository from the working context. Ask before creation if it remains ambiguous.

## Research the behaviour

1. Read the nearest applicable `TICKETS.md` completely. Search the target plugin repository or its parent workspace if it is not in the current repository. If none exists, say so and use the required structure below.
2. Inspect the relevant repository and documentation deeply enough to understand current behaviour, desired behaviour, constraints, and risks.
3. Keep direct code references out of the issue title and body. Do not include file paths, class or function names, implementation identifiers, or route strings. Plugin names, user-facing features, and stable reference documentation are allowed.
4. Split independently shippable stages into separate proposed tickets instead of making one oversized issue.

## Draft the issue

Use the applicable `TICKETS.md` skeleton. At minimum, include these sections:

- Plugin
- Summary
- Motivation
- Expected behaviour
- Risks
- Open questions
- Acceptance criteria

Write acceptance criteria as `- [ ]` behaviour-level checks. Include only genuine open forks and give a recommendation for each. Do not add implementation plans or code references.

Inspect available labels with `gh label list` in the target repository. Apply a label only when it genuinely fits; otherwise leave the issue unlabeled. Apply `responsive-ui` whenever expected behaviour changes layout across viewports.

## Resolve the sprint

Use today's local date from `date +%F`. Query project 5 owned by `marcin-wosinek` and compare the date with each iteration's `startDate` and `duration`:

```sh
gh api graphql -f query='query { user(login: "marcin-wosinek") { projectV2(number: 5) { fields(first: 20) { nodes { ... on ProjectV2IterationField { id configuration { iterations { id title startDate duration } } } } } } } }'
```

Select the iteration containing today for `current`, or the immediately following iteration for `next`. Tickets belong in the Fair Event Plugins project iteration, not a milestone.

## Require confirmation

Present the complete proposed title, body, target sprint, and label selection in chat. Pause and do not create or modify anything on GitHub until the user explicitly approves.

If the user requests any change, revise the draft and present the full updated version for approval again.

## Create and schedule the approved issue

After approval only:

1. Write the exact approved body to a uniquely named temporary file created with `mktemp`.
2. Create the issue with `gh issue create`, using `--body-file` and any approved label.
3. Add the resulting issue URL to project 5:

```sh
gh project item-add 5 --owner marcin-wosinek --url "<issue-url>" --format json --jq '.id'
```

4. Set the project's Iteration field with the returned item ID and resolved iteration ID:

```sh
gh project item-edit --id "<item-id>" \
  --project-id PVT_kwHOAA-jmM4Bfe4P \
  --field-id PVTIF_lAHOAA-jmM4Bfe4PzhZxd2o \
  --iteration-id "<resolved-iteration-id>"
```

5. Remove the temporary body file.
6. Verify the issue was added to the intended iteration and report its URL.

Never include Claude attribution. Do not write to production systems as part of ticket research.
