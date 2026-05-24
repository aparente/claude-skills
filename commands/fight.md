# Fight

Pit Claude and Gemini against each other as adversarial agents to find bugs, challenge assumptions, and confirm accuracy. Dual-model red-team mode.

**Requires:** the `gemini` CLI ([install instructions](https://github.com/google-gemini/gemini-cli)) authenticated on the host. Without it the Gemini-side agents will fail and you'll get a Claude-only review.

## Usage

```
/fight [target]
/fight          # Fight the most recent work in conversation
```

## Arguments

$ARGUMENTS: Target to fight (optional)
- No argument: Fight the most recent substantial work (code, analysis, plan, claims)
- `code`: Focus on code quality, bugs, edge cases
- `claims`: Focus on factual accuracy and verification
- `plan`: Challenge implementation approach and assumptions
- `file:path/to/file`: Fight a specific file
- `last N`: Fight the last N messages of work

## Fight Modes

The skill determines the appropriate fight mode based on target:

| Target Type | Fight Mode | Focus |
|-------------|------------|-------|
| Code | `code-fighter` | Bugs, edge cases, security, logic errors |
| Analysis/Claims | `fact-fighter` | Accuracy, sources, contradictions |
| Plans/Architecture | `plan-fighter` | Assumptions, missing cases, feasibility |
| Data/Output | `data-fighter` | Correctness, completeness, consistency |

## Instructions

### Step 1: Identify Target

If no argument provided, analyze the conversation to find the most recent:
- Code written or modified
- Analysis or claims made
- Plan or architecture proposed
- Data transformation or output generated

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️  FIGHT MODE: CLAUDE vs GEMINI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: [description of what's being fought]
Mode: [code-fighter | fact-fighter | plan-fighter | data-fighter]
Scope: [files/messages/claims being examined]

Fighters:
  🟣 Claude  — Task agents (in-process, has conversation context)
  🔵 Gemini  — CLI agents (out-of-process, fresh external perspective)
```

### Step 2: Prepare the Target Payload

Before deploying agents, prepare the target material:

1. **For code targets**: Identify the file paths and relevant code sections.
2. **For claims/plans**: Summarize the key claims or plan points as a text block.
3. **For data**: Extract the data or output to examine.

This payload will be passed to BOTH Claude (via Task prompt) and Gemini (via CLI stdin/prompt).

### Step 3: Deploy Adversarial Agents — BOTH MODELS IN PARALLEL

Launch Claude agents via `Task` tool and Gemini agents via `Bash` tool (`gemini` CLI) **in parallel**.

Each model gets **different adversarial personas** so their attacks complement rather than duplicate.

#### Claude's Corner (Task tool agents)

Claude agents have full conversation context. Assign them personas that benefit from that context:

**Code fights:**
- **Bug Hunter**: "I assume every line has a bug. Prove me wrong." — Off-by-one, null handling, type mismatches, resource leaks, race conditions, unhandled exceptions.
- **Logic Critic**: "Your logic is flawed. Let me show you why." — Incorrect algorithms, wrong assumptions, missing conditions, inverted logic, unreachable code.

**Fact fights:**
- **Contradiction Hunter**: "You said X earlier, now you say Y. Which is it?" — Internal consistency, conflicts with prior statements, logical contradictions.
- **Devil's Advocate**: "Here's why you're completely wrong." — Alternative interpretations, counter-arguments, overlooked perspectives.

**Plan fights:**
- **Assumption Attacker**: "Every assumption you made is probably wrong." — Unstated assumptions, optimistic estimates, missing requirements.
- **Failure Mode Finder**: "How will this fail in production?" — Deployment issues, monitoring gaps, rollback scenarios.

**Data fights:**
- **Data Validator**: "Your data is wrong until proven right." — Schema violations, missing fields, invalid values.

#### Gemini's Corner (gemini CLI via Bash)

Gemini has NO conversation context — it gets a fresh, unbiased look. Assign personas that benefit from an outsider's perspective:

**Code fights:**
- **Edge Case Explorer**: Weird inputs, empty values, huge payloads, malicious data, Unicode, concurrency, timeouts.
- **Security Skeptic**: Injection vulnerabilities, auth gaps, sensitive data exposure, OWASP Top 10.

**Fact fights:**
- **Source Verifier**: Verify claims, check for hallucinated facts, validate numbers and statistics.
- **Fresh Eyes Critic**: As an outsider, what seems wrong, unclear, or unjustified?

**Plan fights:**
- **Complexity Critic**: Is this overengineered or dangerously underengineered? YAGNI, scalability.
- **Outsider Reviewer**: Without context bias, does this plan actually make sense?

**Data fights:**
- **Completeness Checker**: Missing edge cases, incomplete transformations, lost or truncated data.

#### How to invoke Gemini CLI

Run Gemini via Bash. Pass the target content and adversarial prompt via stdin. Example:

```bash
echo "TARGET CODE:
$(cat path/to/file.ts)

You are an adversarial security reviewer. Your persona: 'I will find how this can be exploited.'
Your job is to FIND PROBLEMS, not praise code. Focus on: injection vulnerabilities, auth gaps, sensitive data exposure, OWASP Top 10.
For each issue: state the problem, show evidence (line numbers), explain severity (CRITICAL|HIGH|MEDIUM|LOW), suggest a fix.
DO NOT praise the code. DO NOT make up issues. BE ADVERSARIAL BUT FAIR." | gemini
```

For non-file targets (claims, plans), echo the content directly:

```bash
echo "TARGET CLAIMS:
[paste the claims/plan text here]

You are an adversarial fact-checker. Your persona: 'Citation needed. And I will check if it is real.'
..." | gemini
```

**Important**: Run Gemini commands with `timeout 120` to avoid hangs. Run multiple Gemini agents as separate parallel Bash calls.

### Step 4: Run Fight Rounds

#### Round 1: Opening Blows (parallel, both models)
```
Deploy IN PARALLEL:
  🟣 Claude: 2 Task agents (haiku model for speed)
  🔵 Gemini: 2 Bash/gemini CLI calls

Goal: Fast surface-level scan from two different AI perspectives
```

#### Round 2: Deep Strikes (based on Round 1 findings)
```
Deploy:
  🟣 Claude: 1-2 Task agents (sonnet model) diving into issues found
  🔵 Gemini: 1 CLI call focusing on areas Claude might have blind spots

Goal: Thorough examination, cross-model validation
```

#### Round 3: Cross-Examination
```
Take Gemini's findings and ask Claude to evaluate them.
Take Claude's findings and pass them to Gemini for evaluation.

This creates genuine adversarial tension:
  - "Gemini found X. Claude, do you agree or disagree?"
  - "Claude found Y. Gemini, is this a real issue?"

Goal: Filter out false positives, surface true issues both models agree on
```

### Step 5: Report Findings

Present findings with attribution to which model found each issue:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚔️  FIGHT REPORT: CLAUDE vs GEMINI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL (must fix)
┌─────────────────────────────────────────────────────────────┐
│ [Issue 1]                                                   │
│ Found by: 🟣 Claude (Bug Hunter) + 🔵 Gemini (Security)    │
│ Agreement: BOTH MODELS AGREE                                │
│ Location: [file:line or claim]                              │
│ Problem: [description]                                      │
│ Evidence: [proof/example]                                   │
│ Fix: [suggested remediation]                                │
└─────────────────────────────────────────────────────────────┘

🟠 HIGH (should fix)
┌─────────────────────────────────────────────────────────────┐
│ [Issue 2]                                                   │
│ Found by: 🔵 Gemini (Edge Case Explorer)                   │
│ Claude's take: [agrees / disagrees / adds context]         │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘

🟡 MEDIUM (consider fixing)
...

🟢 LOW (nice to fix)
...

⚖️  DISPUTED (models disagree)
┌─────────────────────────────────────────────────────────────┐
│ [Issue N]                                                   │
│ 🟣 Claude says: [position]                                 │
│ 🔵 Gemini says: [position]                                 │
│ Resolution: [your judgment or "needs human decision"]      │
└─────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIGHT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Issues Found: [total]
├─ Critical: [count]
├─ High: [count]
├─ Medium: [count]
├─ Low: [count]
└─ Disputed: [count]

Model Breakdown:
├─ 🟣 Claude found: [count] issues
├─ 🔵 Gemini found: [count] issues
├─ Both agreed on: [count] issues
└─ Disagreed on: [count] issues

VERDICT: [PASS | NEEDS WORK | FAIL]
CONFIDENCE: [HIGH if models agree | MEDIUM if some disputes | LOW if many disputes]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 6: Offer Resolution

After presenting the report:

```
What would you like to do?

1. Fix all critical issues now
2. Fix critical + high issues
3. Deep dive on disputed issues (run another Claude vs Gemini round)
4. Let me explain [specific issue]
5. I disagree with [issue] — let's discuss
6. Accept findings and continue
```

## Agent Prompt Templates

### Claude Task Agent Template
```
You are an adversarial reviewer with the persona: "[PERSONA]"
You are fighting on Team Claude against Team Gemini. Your job is to find MORE and BETTER issues than Gemini will.

Your job is to FIND PROBLEMS, not praise work. Assume bugs/errors exist until proven otherwise.

TARGET:
[code, claims, plan, or data]

FOCUS AREAS:
[specific focus for this agent]

INSTRUCTIONS:
1. Examine the target with extreme skepticism
2. For each potential issue found:
   - State the problem clearly
   - Show evidence (line numbers, examples)
   - Explain why it's a problem
   - Rate severity: CRITICAL | HIGH | MEDIUM | LOW
   - Suggest a fix if obvious
3. If you find nothing, explain what you checked and why it passed

DO NOT:
- Praise the code/work
- Say "looks good"
- Make up issues that don't exist
- Miss obvious problems to be nice

BE ADVERSARIAL BUT FAIR. Real issues only. Make Claude proud.
```

### Gemini CLI Prompt Template
```
You are an adversarial reviewer with the persona: "[PERSONA]"
You have NO prior context about this work — you are seeing it fresh. That is your advantage.

Your job is to FIND PROBLEMS that an insider might miss.

TARGET:
[code, claims, plan, or data]

FOCUS AREAS:
[specific focus for this agent]

INSTRUCTIONS:
1. Examine the target with extreme skepticism and fresh eyes
2. For each potential issue found:
   - State the problem clearly
   - Show evidence (line numbers, examples)
   - Explain why it's a problem
   - Rate severity: CRITICAL | HIGH | MEDIUM | LOW
   - Suggest a fix if obvious
3. If you find nothing, explain what you checked and why it passed

DO NOT praise. DO NOT invent fake issues. BE ADVERSARIAL BUT FAIR.
Output ONLY your findings in a structured list. No preamble.
```

## Configuration

### Intensity Levels

- `/fight --quick`: Round 1 only (1 Claude + 1 Gemini, fast scan)
- `/fight --thorough`: All 3 rounds, full agent roster
- `/fight --brutal`: Maximum intensity — more agents per model, cross-examination, no mercy

Default is `--thorough`.

## Examples

```
/fight
```
Both models fight the most recent work.

```
/fight code
```
Claude hunts bugs/logic, Gemini hunts edge cases/security — in parallel.

```
/fight file:src/components/Auth.tsx
```
Both models independently attack a specific file.

```
/fight claims
```
Claude checks internal consistency, Gemini independently verifies facts.

```
/fight --brutal plan
```
Full adversarial assault on the most recent plan from both models.

## Notes

- **Dual-model advantage**: Each model has different training data, biases, and blind spots. Using both catches more issues than either alone.
- **Context vs Fresh Eyes**: Claude knows the conversation history (catches inconsistencies). Gemini sees it fresh (catches assumptions you've normalized).
- **Disputed issues are valuable**: When the models disagree, that's often where the most interesting problems hide.
- **Fairness**: Adversarial but not unfair — don't invent problems.
- **Actionable**: Every finding should have a clear path to resolution.

## Integration with Other Skills

- After `/fight`, run fixes, then `/fight` again to verify
- Before committing: `/fight code` → fix → `/commit`
- Before PR: `/fight --thorough` → address findings → create PR
- After enrichment: `/fight claims` to verify accuracy

## Fight Philosophy

> "Two AIs are harder to fool than one. The goal isn't to win the fight — it's to make the work bulletproof."

When Claude and Gemini both agree something is broken, it's almost certainly broken. When they disagree, that's where human judgment matters most.
