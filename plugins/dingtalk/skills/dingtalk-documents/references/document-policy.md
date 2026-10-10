# DingTalk Document Policy

Use the configured `documents_root` for local Markdown that is pulled from or intended to be
published to DingTalk. Respect the broader workspace rules that apply to that directory; this
policy adds DingTalk-specific behavior and does not replace project ownership or confidentiality
rules.

## Local Files

- Treat local Markdown as the source of truth for managed documents.
- Use one H1 heading as the document title. DingTalk creation uses the first H1 as the remote title.
- Use the bundled `assets/document.md` as the starting point for a new document. Adapt the
  sections to the subject and remove empty sections instead of filling them mechanically.
- Store a document under `documents_root/YYYY/MM/<descriptive-name>.md` unless the user supplies
  an explicit path that complies with the surrounding workspace rules.
- Do not manually edit the `dingtalk` YAML front matter written by the workflow tools.
- Do not publish local paths, `file://` links, or relative links that a DingTalk reader cannot
  access. Replace them with accessible DingTalk or web links, or remove them.

## Bindings And Synchronization

- Treat a pulled `reference` document as read-only local context.
- Adopt a reference only after the user explicitly accepts local ownership of future updates.
- After completing every create or update, prepare it, show the operation and target, and obtain
  explicit confirmation before pushing.
- Stop on remote drift. Pull or reconcile the remote change before preparing another update.
- Rename the remote document only when the user explicitly requests the title change.

See [state.md](state.md) only when inspecting bindings, revisions, hashes, or conflicts.
