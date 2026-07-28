# Claude Skills & Commands

Reusable [Claude Code](https://docs.anthropic.com/en/docs/claude-code) extensions — both skills (auto-triggered by description) and slash commands (explicitly invoked).

Live demo gallery: **https://aparente.github.io/claude-skills/**

## Layout

```
claude-skills/
├── skills/         # auto-triggered skills — install to ~/.claude/skills/
├── commands/       # slash commands — install to ~/.claude/commands/
├── output-styles/  # output styles — install to ~/.claude/output-styles/
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

## Commands

See [`commands/README.md`](./commands/README.md) for the full list. Currently includes:

- `/wrapup` — end-of-session git workflow (commit → review → cleanup → commit → push)
- `/handoff [title]` — session continuity file generator
- `/fight [target]` — dual-model red team (Claude vs Gemini adversarial review) — requires the `gemini` CLI

## Output Styles

### adhd-comms

Action-first, scannable output. Answers lead with the point, steps are numbered, and filler is cut. Combines plain-language communication rules with ADHD-friendly formatting (5-15 minute task chunks, one recommendation, checklists over paragraphs). Activate from `/config` > Output Style.

## License

MIT
