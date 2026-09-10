# Project Context Model

## Context Layers

| Layer | Primary question | Typical owner | Update trigger | End state |
| --- | --- | --- | --- | --- |
| Global context | What is shared across projects? | Global `CLAUDE.md` | A cross-project convention changes | Remains concise and stable |
| Project context | What is this repository and where is truth kept? | Project `CLAUDE.md` | Stable structure, interface, or boundary changes | Remains concise and stable |
| Current status | What is true now and what comes next? | `docs/project-status.md` | A material capability, dependency, phase, or next milestone changes | Replaced in place |
| Active plan | How is the current initiative progressing? | `.claude/plans/<initiative>.md` | A stage, decision, discovery, validation result, or next action changes | Removed after handoff |
| Durable knowledge | What remains true after this initiative? | Requirements, design, contract, decision, analysis, runbook | Confirmed intent, interface, evidence, or operation changes | Versioned and indexed |
| History | What changed and why over time? | Git, issue tracker, pull requests | Work is recorded | Retained as history |

One fact has one authoritative owner. Other layers point to it and summarize
only what their own question requires.

## Project Shape

A maintained repository normally exposes these semantic areas:

```text
README.md                 human entry point
CLAUDE.md                 stable project context for Claude Code
docs/INDEX.md             durable-document inventory
docs/project-status.md    current tracked snapshot, when useful
.claude/plans/            ignored active execution memory
<source areas>/           product or analysis source by ownership
<tests>/                  verification close to its owner
<operations>/             scripts, deployment definitions, migrations, runbooks
<local artifacts>/        ignored data, credentials, environments, models, outputs
```

Names and depth follow the repository ecosystem. A small script may need only
a README and source file. A monorepo may organize source by deployable component
and shared package. The semantic responsibilities remain the same.

## Project `CLAUDE.md`

Own only stable context needed to work in the repository:

- repository identity, scope, and maturity;
- context entry points and source-of-truth map;
- component or directory ownership;
- project-specific invariants and external-system boundaries;
- canonical development, validation, and delivery interfaces;
- local safety rules that cannot be inferred from the codebase.

Do not own active phase details, task checklists, dated execution logs, design
explanations, or generic advice already supplied by Claude.

## Multi-Harness Repositories

When the repository is worked on with more than one agent CLI, the project
context layer still has exactly one owner. The canonical file holds the
content; the other harness's entry point imports it.

| Situation | Canonical | Bridge |
| --- | --- | --- |
| Repository already maintains `AGENTS.md` | `AGENTS.md` | `CLAUDE.md` imports it with `@AGENTS.md` |
| Claude Code only | `CLAUDE.md` | None |

The same rule applies to the active-plan directory: declare one location in the
canonical file rather than maintaining a separate plans directory per harness.
Harness-specific instructions are the only content that legitimately lives in a
non-canonical entry point.

## Project Status

Keep one current snapshot rather than a cumulative diary. It should make the
following discoverable:

- as-of date and current phase;
- verified capabilities and known limitations;
- work currently active and its plan identifier;
- external dependencies or decisions affecting the next milestone;
- next milestone and completion signal;
- links to the small set of durable documents that explain the current phase.

Update it when those facts materially change, not after every edit.

## Durable Documentation

Use categories by responsibility, not because every project must contain every
directory:

| Category | Owns |
| --- | --- |
| `requirements/` | Confirmed goals, scope, constraints, acceptance |
| `design/` | Current architecture and technical decisions in force |
| `contracts/` or `data/` | Interfaces, schemas, events, data semantics |
| `decisions/` | Decisions whose alternatives and rationale matter later |
| `runbooks/` | Repeatable operational procedures and recovery |
| `development/` | Stable repository development and delivery context |
| `analysis/` | Evidence, investigations, estimates, and validation reports |

`docs/INDEX.md` lists the documents that actually exist, their purpose, and
which are authoritative. Superseded evidence is visibly historical or archived
instead of competing with current design.

## Temporary Plans

An active plan is working memory for an initiative that spans stages or
sessions. It may contain incomplete ideas and changing execution detail, so it
is not a durable design or status document. The project status names the active
initiative; the plan holds its detailed continuation state. On completion,
transfer confirmed results to durable owners, refresh status, then remove the
plan.
