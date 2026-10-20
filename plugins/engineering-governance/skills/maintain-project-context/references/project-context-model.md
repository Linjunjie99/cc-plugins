# Project Context Model

## Context Layers

| Layer | Primary question | Typical owner | Update trigger | End state |
| --- | --- | --- | --- | --- |
| Global context | What is shared across projects? | The harness's own global file (`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`) | A cross-project convention changes | Remains concise and stable |
| Project context | What is this repository and where is truth kept? | Project `AGENTS.md` | Stable structure, interface, or boundary changes | Remains concise and stable |
| Current status | What is true now and what comes next? | `docs/project-status.md` | A material capability, dependency, phase, or next milestone changes | Replaced in place |
| Active plan | How is the current initiative progressing? | `.agents/plans/<initiative>.md` | A stage, decision, discovery, validation result, or next action changes | Removed after handoff |
| Durable knowledge | What remains true after this initiative? | Requirements, design, contract, decision, analysis, runbook | Confirmed intent, interface, evidence, or operation changes | Versioned and indexed |
| History | What changed and why over time? | Git, issue tracker, pull requests | Work is recorded | Retained as history |

One fact has one authoritative owner. Other layers point to it and summarize
only what their own question requires.

## Project Shape

A maintained repository normally exposes these semantic areas:

```text
README.md                 human entry point
AGENTS.md                 stable project context shared by every harness
CLAUDE.md                 imports AGENTS.md; Claude Code-only notes, when any
docs/INDEX.md             durable-document inventory
docs/project-status.md    current tracked snapshot, when useful
.agents/plans/            ignored active execution memory
.codex/plans, .claude/plans  ignored local links to .agents/plans/
<source areas>/           product or analysis source by ownership
<tests>/                  verification close to its owner
<operations>/             scripts, deployment definitions, migrations, runbooks
<local artifacts>/        ignored data, credentials, environments, models, outputs
```

Names and depth follow the repository ecosystem. A small script may need only
a README and source file. A monorepo may organize source by deployable component
and shared package. The semantic responsibilities remain the same.

## Project `AGENTS.md`

Own only stable context needed to work in the repository:

- repository identity, scope, and maturity;
- context entry points and source-of-truth map;
- component or directory ownership;
- project-specific invariants and external-system boundaries;
- canonical development, validation, and delivery interfaces;
- local safety rules that cannot be inferred from the codebase.

Do not own active phase details, task checklists, dated execution logs, design
explanations, or generic advice already supplied by the agent.

## Harness Entry Points

Project context has exactly one owner: `AGENTS.md`. Codex loads it natively.
Claude Code loads `CLAUDE.md`, which imports it with `@AGENTS.md`.

| File | Holds | Never holds |
| --- | --- | --- |
| `AGENTS.md` | All shared project context, plus an optional final `Codex Notes` section for Codex-only instructions | Facts restated from anywhere else |
| `CLAUDE.md` | `@AGENTS.md` and an optional `Claude Code Notes` section for Claude Code-only instructions | Any shared project fact |

- Shared context lives in `AGENTS.md` because Codex does not expand `@`
  imports; only a file Codex loads itself is guaranteed to reach it.
- Write shared content in harness-neutral terms ("the agent", "agent tools").
  A rule phrased for one harness is not reliably followed by the other. Name a
  harness only inside its own notes section.
- Converting a repository: when only `CLAUDE.md` exists, move its content into
  `AGENTS.md` in neutral wording and reduce `CLAUDE.md` to the import. When
  both are populated, merge them into `AGENTS.md` and remove the duplicates.
  Show the user what will be removed from a populated file before removing it.

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

An active plan lives in `.agents/plans/`. The harness-default paths
`.codex/plans/` and `.claude/plans/` are local symlinks to it, so a plan lands
in the same directory whichever harness writes it. All three paths are ignored
by Git. `scripts/link_plans.py` creates the links, merges an existing real
`.codex/plans/` or `.claude/plans/` directory into `.agents/plans/`, and
replaces directory-only ignore patterns, which cannot match a symlink.
