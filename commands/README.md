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
| `/fight [target]` | Dual-model red team: deploy Claude + Gemini as adversarial agents to find bugs, challenge assumptions, and cross-examine each other's findings. Reports critical/high/medium/low + disputed issues with per-model attribution. **Requires the `gemini` CLI.** |

## Notes on portability

- `/handoff` tries to link to a session transcript if one exists. It checks for the `superpowers` plugin's archive first, then Claude Code's default. If neither exists, it omits the transcript reference rather than including a broken path.
- `/fight` needs the [`gemini` CLI](https://github.com/google-gemini/gemini-cli) installed and authenticated. The Claude-side agents will still run without it, but you lose the dual-model advantage that's the whole point of the command.
