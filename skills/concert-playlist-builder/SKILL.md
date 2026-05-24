---
name: concert-playlist-builder
description: |
  Extract artists from concert/festival lineups and create playlists to preview their music.
  Use this skill when:
  - User shares a concert, festival, or event URL and wants to discover the artists
  - User asks to create playlists from a lineup (Apple Music, YouTube, Spotify)
  - User wants to preview music before attending a show
  - User mentions RA (Resident Advisor), Songkick, Bandsintown, or any event page with artists
  Triggers: "create playlist from lineup", "extract artists from concert", "make a playlist for [event]", "preview the artists", "who's playing at [event]"
---

# Concert Playlist Builder

Extract artists from any concert/event page and create playlists on Apple Music, YouTube, and/or Spotify.

## Workflow

### 1. Extract Artists from Event Page

Use WebFetch to get the event page content, then extract artist names:

```
WebFetch: [event URL]
Prompt: "Extract all artist/performer names from this event page. Return as a simple list."
```

Common sources: RA (ra.co), Songkick, Bandsintown, Eventbrite, festival websites.

### 2. Confirm with User

Present the extracted lineup and ask which platforms to create playlists on:
- Apple Music (browser: music.apple.com)
- YouTube (browser: youtube.com)
- Spotify (browser: open.spotify.com)

### 3. Create Playlists

Use browser automation (mcp__claude-in-chrome__* tools) for each platform. See platform references:
- [references/apple-music.md](references/apple-music.md) - Apple Music Web Player patterns
- [references/youtube.md](references/youtube.md) - YouTube playlist patterns
- [references/spotify.md](references/spotify.md) - Spotify Web Player patterns

**Parallel execution**: Use Task tool with subagent_type to create playlists on multiple platforms simultaneously.

### 4. Handle Missing Artists

Some underground artists may not be on all platforms. Log which artists couldn't be found and continue with the rest.

## Quick Reference

### Browser Automation Pattern (all platforms)

```
1. Navigate to platform
2. Create new playlist with event name
3. For each artist:
   a. Search for artist
   b. Hover over top result to reveal menu
   c. Click "..." or menu button
   d. Select "Add to Playlist" → [playlist name]
4. Report final count
```

### Key Tips

- Wait 2 seconds after searches for results to load
- Use `hover` action to reveal hidden menu buttons
- If artist not found, try adding genre qualifier (e.g., "Oscar Mulero techno")
- Track progress with TodoWrite for large lineups
