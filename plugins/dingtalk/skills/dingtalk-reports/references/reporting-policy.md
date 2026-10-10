# Reporting Policy

Use the configured `reports_root` for DingTalk daily, weekly, monthly, and annual reports. Respect
the broader workspace rules that apply to that directory; this policy
adds DingTalk-specific behavior and does not replace project ownership or confidentiality rules.

## Files And Naming

- `daily/YYYY/MM/YYYY-MM-DD.md`: daily report.
- `weekly/YYYY/YYYY-Www.md`: weekly report using an ISO week from Monday through Sunday.
- `monthly/YYYY/YYYY-MM.md`: monthly report.
- `annual/YYYY.md`: annual summary.
- Keep one canonical file for each period. Update it instead of creating `final`, `v2`, or other
  duplicate drafts.
- Do not create a local templates directory. Use the matching template in this skill's `assets/`
  directory whenever a new report is needed.

## Writing

- Read the matching skill asset, existing report, and relevant work materials before drafting.
- Replace `{{period}}`, adapt the template to the actual work, and remove empty sections instead of
  inventing content or filling them with placeholders such as "none".
- Keep daily reports brief and focused on current work and progress.
- Group weekly reports by work item and explain progress, outputs, effect, and the next step when
  relevant. Do not concatenate daily reports by date.
- Summarize stage results, impact, risks, and direction in monthly reports.
- Summarize annual outcomes, lessons, and direction in annual reports.
- Do not send local paths, `file://` links, or local-only relative links. Include only DingTalk or
  web links accessible to the recipients.
- Do not manually edit the `dingtalk` YAML front matter written by the workflow tools.

## Publishing

- Treat recipient lists as the unique union of configured `common` and report-type organization
  userIds. An explicit recipient list replaces those defaults.
- Publish every report type through DingTalk's `空白日志` template so the local Markdown body is
  preserved in its single `内容` field.
- After completing a new draft or revision, prepare publication and show the local report file
  path, blank-log template, recipients, `to_chat=false`, and manual rename reminder. Obtain explicit
  confirmation before publishing. Do not show the content hash; it is an internal integrity detail
  rather than useful review information.
- The report creator is the MCP-authenticated account owner. Recipients are separate people who
  receive the report. Use "MCP 绑定账号本人" when the creator's display name is unavailable.
- After publication, remind the user to rename "创建人姓名的空白日志" in DingTalk to the
  corresponding "创建人姓名的日报", "创建人姓名的周报", "创建人姓名的月报", or
  "创建人姓名的年报". "创建人姓名" is the MCP-bound account owner, not a recipient. The official
  Log MCP cannot set the report name.
- Treat a published report as immutable through the available MCP. Local edits after publishing
  require a manual DingTalk edit.
- Republish only after the user manually deletes the old report and explicitly confirms that
  deletion. Preserve the prior publication in local history.
- Treat pulled sent or received reports as read-only archives, never as drafts for republishing.
