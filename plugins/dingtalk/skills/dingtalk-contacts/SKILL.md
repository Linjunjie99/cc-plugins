---
name: dingtalk-contacts
description: Search and verify DingTalk organization contacts (钉钉通讯录) and userIds. Use when the user provides a colleague name or mobile number, needs a DingTalk organization userId, or wants to configure or override work-report recipients (日志接收人).
---

# DingTalk Contacts

Use `dingtalk_contacts_find` to search by name or mobile and fetch organization details for candidate userIds.

Do not treat a personal DingTalk handle as an organization userId. When multiple people match, present their name, department, manager, and userId and ask the user to select. Never guess a report recipient.

Store only verified organization userIds in `dingtalk.toml`, through the `dingtalk-setup` skill's
`set-recipients` script rather than by editing the file. Do not expose mobile numbers or unrelated profile fields in summaries.
