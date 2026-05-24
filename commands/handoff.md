# Handoff

Create a session handoff file for continuity with the next Claude Code session.

## Usage

```
/handoff [brief title or summary]
```

## Arguments

$ARGUMENTS: A brief title or summary for the handoff (used in filename). If not provided, auto-generate from session content.

## Instructions

1. **Determine the project name** from the current working directory (use the directory name).

2. **Determine the transcript path** (optional — depends on environment):
   - The session ID is available from the conversation context
   - Convert the working directory path to a slug format (replace `/` with `-`, e.g., `/Users/example/code/Play` becomes `-Users-example-code-Play`)
   - Check these candidate locations in order, using the first that exists:
     a. `~/.config/superpowers/conversation-archive/[path-slug]/[session_id].jsonl` (requires the `superpowers` plugin)
     b. `~/.claude/projects/[path-slug]/[session_id].jsonl` (Claude Code default)
   - If none exist, omit the transcript reference section rather than including a broken path

3. **Review the current session** by analyzing:
   - The conversation history and what was discussed
   - Any active todo items (check the TodoWrite state)
   - Files that were read or modified during the session
   - Key decisions that were made
   - Questions that were asked/answered
   - Any errors encountered and how they were resolved

4. **Identify incomplete work**:
   - Tasks mentioned but not completed
   - Features partially implemented
   - Issues discovered but not resolved
   - Follow-up items mentioned
   - Things the user said they'd do later

5. **Generate the filename**:
   - Format: `YYYY-MM-DD-HHMMSS_title-slug.md`
   - Convert $ARGUMENTS (or auto-generated title) to kebab-case slug
   - Example: `2026-01-04-143022_metadata-menu-setup.md`

6. **Create the handoff file** at `~/.claude/handoffs/[project-name]/[filename]` with this structure:

```markdown
# Session Handoff - [Date] [Time]

**Project:** [project name]
**Working Directory:** [full path]

## Session Summary
[2-3 sentence overview of what this session focused on]

## Transcript Reference
**Session ID:** [session_id from environment]
**Transcript:** [path to transcript file if it exists; omit this section entirely if no transcript location was found]

## Completed
- [x] Task 1
- [x] Task 2

## Incomplete / Next Steps
- [ ] Pending task 1
- [ ] Pending task 2

## Key Decisions
- **Decision 1**: [what was decided and why]
- **Decision 2**: [what was decided and why]

## Important Context
[Any context the next session needs to know - gotchas, constraints, user preferences discovered, workarounds found]

## Files Modified
- `path/to/file1.md` - [brief description of changes]
- `path/to/file2.py` - [brief description of changes]

## Errors & Fixes
[Any errors encountered and how they were resolved - useful for avoiding the same issues]

## Open Questions
- Question 1?
- Question 2?

---
*To resume: Start a new session and say "Please read ~/.claude/handoffs/[project]/[this-file].md for context"*
*If you have the `episodic-memory` plugin, you can also search with: "search episodic memory for handoffs about [topic]"*
```

7. **Create the project subdirectory** if it doesn't exist.

8. **Write the file automatically** - no need to ask for confirmation if the project directory is clear from the current working directory. Just write it and report the path.

9. **Remind the user** how to use this handoff in the next session.

## Example

User runs (from a project working directory called `my-app`): `/handoff auth refactor`

Creates: `~/.claude/handoffs/my-app/2026-01-04-143022_auth-refactor.md`

## Notes

- This command works for **any project** — it's not specific to any codebase
- Handoff files are stored globally in `~/.claude/handoffs/` organized by project
- If the `episodic-memory` plugin is installed, handoff files become searchable across future sessions
- Keep the summary concise but capture enough context for continuity
- The transcript reference (if a path was found in step 2) links to the conversation JSONL for deep-dive debugging
- If no transcript path was found, omit the transcript reference section rather than including a broken or speculative path
