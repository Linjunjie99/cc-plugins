# Document State

- `reference`: pulled for local context; remote overwrite is blocked.
- `managed`: local Markdown may update the recorded remote `node_id` after preparation and confirmation.
- `synced_content_sha256`: remote content observed at the last successful pull or push.
- `remote_revision`: revision passed to DingTalk when available.

Preparation fetches the remote document. A changed remote hash blocks the push so edits are not silently lost. A confirmation token expires after ten minutes and becomes invalid when the local file changes.
