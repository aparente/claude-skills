# Wrapup

Complete a git workflow cycle: **commit → review → cleanup → commit → push** before ending a session.

The key insight: commit your work FIRST as a safety net, THEN do cleanup in a separate commit.

## Usage

```
/wrapup [optional: commit message hint]
```

## Arguments

$ARGUMENTS (optional): A hint for the commit message theme or scope.

## Instructions

### Phase 0: Directory Verification

0. **Verify working directory**:
   - Confirm current directory is a git repository (`.git` folder exists)
   - Display the repository name and current branch
   - If NOT in a git repo, STOP and warn the user
   - This ensures we never accidentally commit/push from the wrong location

### Phase 1: Status Check

1. **Check git status** to see what's changed:
   - Staged changes
   - Unstaged changes
   - Untracked files
   - Current branch and remote tracking status

2. **If no changes**, report "Working tree clean" and skip to Phase 4 (push check).

3. **If changes exist**, show a summary and proceed.

### Phase 2: Save Work (First Commit)

4. **Review the diff** to understand what changed.

5. **Stage appropriate files**:
   - Stage modified/new files that are part of the work
   - DO NOT stage files that look like secrets (.env, credentials, API keys)
   - DO NOT stage unrelated changes without asking

6. **Draft a commit message**:
   - Follow conventional commit style if the repo uses it
   - Summarize the "why" not just the "what"
   - Keep it concise (1-2 sentences)

7. **Show the user** what will be committed and the proposed message. Proceed without asking for confirmation (directory was verified in Phase 0).

8. **Create the commit** with the standard footer:
   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

9. **Confirm success**: "✅ Work saved in commit [hash] - this is your safety checkpoint."

### Phase 3: Code Review & Cleanup

10. **Review the just-committed code** for:
    - Debug statements left in (console.log, print, debugger)
    - Commented-out code that should be removed
    - TODO comments that were addressed but not removed
    - Obvious typos in strings or comments
    - Unused imports or variables
    - Inconsistent formatting (if no auto-formatter)

11. **If issues found**:
    - List them for the user
    - Ask if they want auto-cleanup
    - If yes, fix the issues
    - Create a SEPARATE cleanup commit: "chore: cleanup debug statements and dead code"
    - Note: The original work is safe in the previous commit

12. **If no issues**, report "Code looks clean, no cleanup needed."

### Phase 4: Push

12. **Check remote status**:
    - Is there a remote configured?
    - Is the branch tracking a remote branch?
    - Are there commits to push?

13. **If commits to push**, proceed directly (directory was verified in Phase 0).

14. **Push to remote** automatically.

15. **Report final status**:
    - Commits made
    - Branch pushed to
    - Any warnings or notes

### Phase 5: Summary

16. **Print a summary** suitable for including in a handoff:
    ```
    ## Git Summary
    - Branch: main
    - Commits: 2 (initial + cleanup)
    - Pushed: Yes, to origin/main
    - Messages:
      - "feat: add Person migration script with verification"
      - "chore: remove debug print statements"
    ```

## Example Flow

```
User: /wrapup auth refactor

Claude:
🔒 Phase 0: Directory Verification
✅ Confirmed: ~/code/my-app (git repo)
   Branch: main

📋 Phase 1: Git Status
- Modified: src/auth/session.ts
- Modified: src/auth/handler.ts
- New:      src/auth/types.ts

📝 Phase 2: Save Work
Committing:
"feat: extract session and types modules from auth handler

Split session lifecycle and shared types out of handler.ts to
clarify responsibilities and prepare for upcoming MFA work."

✅ Work saved in commit abc1234 — this is your safety checkpoint.

🔍 Phase 3: Code Review
Reviewing committed files for cleanup opportunities...

Found 2 issues:
- src/auth/session.ts:45 — debug console.log statement
- src/auth/handler.ts:12 — commented-out code block

Your work is safe in the previous commit. Fix these in a cleanup commit? [yes/no]

User: yes

Claude: ✅ Cleanup committed: def5678

🚀 Phase 4: Push
Pushing to origin/main (2 commits ahead):
  - abc1234: feat: extract session and types modules from auth handler
  - def5678: chore: remove debug logging and dead code

✅ Pushed to origin/main

## Git Summary
- Branch: main
- Commits: 2 (work + cleanup)
- Pushed: Yes, to origin/main
- Safety: Original work preserved in abc1234, cleanup in def5678
```

## Safety Rules

- ALWAYS verify directory first (Phase 0) - this is what enables automatic commit/push
- NEVER force push
- NEVER commit files that look like secrets
- NEVER amend commits that have been pushed
- Always show what will be committed before committing
- Commit and push proceed automatically once directory is verified

## Notes

- Run this before `/handoff` to ensure all work is saved to git
- Works with any git repository
- Respects existing git hooks (pre-commit, etc.)
- If a commit fails due to hooks, report the error and ask how to proceed
