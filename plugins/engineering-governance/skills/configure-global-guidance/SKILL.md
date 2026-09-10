---
name: configure-global-guidance
description: Safely inspect, install, or update the versioned engineering-context section in the user's global Claude Code CLAUDE.md while preserving unrelated instructions. Use when setting up Claude Code on a development machine, synchronizing the shared context and documentation framework, auditing guidance drift, bridging a repository that is also used with another agent CLI, or updating the plugin's canonical global context source.
allowed-tools:
  - Read
  - Bash(python3 "${CLAUDE_PLUGIN_ROOT}/skills/configure-global-guidance/scripts/sync_global_guidance.py" *)
---

# Configure Global Guidance

Maintain one marked section containing only the cross-project context
framework. Preserve unrelated global guidance.

## Workflow

1. Resolve the global target as `$CLAUDE_CONFIG_DIR/CLAUDE.md` when
   `CLAUDE_CONFIG_DIR` is set, otherwise `~/.claude/CLAUDE.md`.
2. Run the script's `check` action.

   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/skills/configure-global-guidance/scripts/sync_global_guidance.py" \
     check --target <path>
   ```

3. Report only whether the managed section is current, missing, outdated, or
   malformed. Do not print unrelated global guidance.
4. Before applying, explain that only the
   `engineering-governance` marked section will change.
5. Run the `apply` action only when the user has explicitly requested
   configuration or synchronization.

   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/skills/configure-global-guidance/scripts/sync_global_guidance.py" \
     apply --target <path>
   ```

6. Run `check` again and report the result.

The canonical section is `assets/global-claude-section.md`. Edit that source
when changing the framework, then validate the script against a temporary target
before applying it to a real global file.

## Multi-Harness Machines

This machine may run more than one agent CLI. Each harness reads its own global
file: Claude Code reads `~/.claude/CLAUDE.md`, and another CLI may read a file
such as `~/.codex/AGENTS.md`. Both may carry an `engineering-governance`
managed section describing the same framework in that harness's own terms.

- Only ever write the target passed to the script. Never edit another harness's
  global file from this skill.
- The managed sections are peers, not copies to diff. Do not rewrite one to
  match the other's wording.
- Report the state of the requested target only.

For per-repository bridging between harnesses, use the
`maintain-project-context` skill instead.

## Safety

- Preserve all text outside the managed markers byte-for-byte except for a
  final newline when creating a previously missing section.
- Stop on duplicate, incomplete, or reversed markers.
- Keep project-specific commands, infrastructure boundaries, current status,
  and active plans out of global guidance.
- Keep the managed section focused on context ownership, discoverability, and
  document lifecycle. Detailed setup logic belongs in the other skills.
