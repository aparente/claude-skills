# Claude Skills & Commands

Reusable [Claude Code](https://docs.anthropic.com/en/docs/claude-code) extensions — both skills (auto-triggered by description) and slash commands (explicitly invoked).

Live demo gallery: **https://aparente.github.io/claude-skills/**

## Layout

```
claude-skills/
├── skills/         # auto-triggered skills — install to ~/.claude/skills/
├── commands/       # slash commands — install to ~/.claude/commands/
├── output-styles/  # output styles — install to ~/.claude/output-styles/
├── mcp-servers/    # MCP servers — build and register in .mcp.json
└── index.html      # Pages landing
```

## Installation

```bash
# Skills
cp -r skills/<skill-name> ~/.claude/skills/

# Commands
cp commands/<command-name>.md ~/.claude/commands/

# Output styles
cp output-styles/<style-name>.md ~/.claude/output-styles/
```

Activate an output style from `/config` > Output Style.

## Skills

### tufte-viz

Apply Edward Tufte's data visualization principles to design and critique charts. Covers all four Tufte books (Visual Display, Envisioning Information, Visual Explanations, Beautiful Evidence) via progressive disclosure: a 4 KB always-loaded `SKILL.md` plus two on-demand reference files. Ships with [four worked pre/post demos](https://aparente.github.io/claude-skills/tufte-viz/demos/).

### d-school

Stanford d.school design thinking facilitator. Runs full design sprints across all five phases (Empathize, Define, Ideate, Prototype, Test) with 12 structured techniques including How-Might-We statements, SCAMPER, Crazy 8s, mind maps, storyboards, empathy maps, design sprints, and "worst possible idea."

### concert-playlist-builder

Extract artists from concert/festival lineups and create playlists on Apple Music, YouTube, and Spotify. Works with RA (Resident Advisor), Songkick, Bandsintown, or any event page.

### google-ai-mode

Query Google's AI Search mode for synthesized answers with source citations from across the web. Returns markdown with footnoted references. Useful for current information and research beyond the model's knowledge cutoff. Ships with a Python runner and browser setup scripts.

### i-have-adhd

Reshape output for ADHD readers: lead with the answer, number the steps, cut preamble and filler. Adapted from [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd).

### humanizer

Remove signs of AI-generated writing so text reads as human. Covers 36 patterns: inflated significance, promotional language, rule-of-three padding, em-dash overuse, AI vocabulary (including "load-bearing" and "seam"), paraprosdokians, and more. Scoped to human-facing copy, not agent instructions. Forked from [blader/humanizer](https://github.com/blader/humanizer) (MIT) at v2.11.1, with added rules.

## Commands

See [`commands/README.md`](./commands/README.md) for the full list. Currently includes:

- `/wrapup` — end-of-session git workflow (commit → review → cleanup → commit → push)
- `/handoff [title]` — session continuity file generator
- `/fight [target]` — dual-model red team (Claude vs Codex GPT-5.6 Sol adversarial review) — requires the Codex plugin

## MCP Servers

### resident-advisor-mcp-server

Find electronic music events on [Resident Advisor](https://ra.co) through its GraphQL API. Nine read-only tools: area lookup, event listings with genre filter and popularity sort, event details, global search, artist profiles, venue details, genre list, plus the `search`/`fetch` pair OpenAI requires for ChatGPT connectors. Runs over stdio (Claude) or streamable HTTP (OpenAI). No API key needed. See [`mcp-servers/resident-advisor-mcp-server/README.md`](./mcp-servers/resident-advisor-mcp-server/README.md) for setup.

## Output Styles

### adhd-comms

Action-first, scannable output. Answers lead with the point, steps are numbered, and filler is cut. Combines plain-language communication rules with ADHD-friendly formatting (5-15 minute task chunks, one recommendation, checklists over paragraphs). Activate from `/config` > Output Style.

## License

MIT
