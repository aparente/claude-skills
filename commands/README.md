# Commands

Reusable slash commands for Claude Code. Each `.md` file in this directory is a single command.

## Install

```bash
cp commands/*.md ~/.claude/commands/
```

Then invoke them in Claude Code with `/command-name`.

## What's here

| Command | Purpose |
|---|---|
| `/wrapup` | Git workflow at end of session: commit your work as a safety net, do cleanup in a separate commit, push. |
| `/handoff [title]` | Generate a session-handoff markdown file (`~/.claude/handoffs/<project>/<timestamp>_<title>.md`) capturing summary, completed/incomplete work, key decisions, and files modified — for clean pickup in the next session. |

## Notes on portability

- `/handoff` tries to link to a session transcript if one exists. It checks for the `superpowers` plugin's archive first, then Claude Code's default. If neither exists, it omits the transcript reference rather than including a broken path.
