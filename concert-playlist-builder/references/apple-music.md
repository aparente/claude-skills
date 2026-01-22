# Apple Music Web Player

## Setup

1. Navigate to `https://music.apple.com`
2. User must be signed in (prompt if not)
3. Get tab context with `tabs_context_mcp`

## Create New Playlist

1. Navigate to Library > Playlists: `https://music.apple.com/us/library/all-playlists/`
2. Click "New Playlist" button (usually top-right area)
3. Enter playlist name and confirm

## Add Songs to Playlist

### Search Pattern

```
1. Click search box (left sidebar, ref usually "Search" textbox)
2. form_input: artist name
3. key: Return
4. wait: 2 seconds for results
```

### Add Song Pattern

```
1. In search results, hover over a song card to reveal "+" and "..." buttons
2. Click "..." button (coordinates near right edge of song card)
3. Context menu appears with options
4. Click "Add to Playlist"
5. Submenu shows playlists - click target playlist name under "Recents"
```

### Element Coordinates (typical)

- Search box: Left sidebar, ~(137, 81)
- Song "..." button: Right side of song card, appears on hover ~(647, 371) for left column
- "Add to Playlist" menu item: ~(697, 67) in context menu
- Playlist name in submenu: Under "Recents" section, ~(889, 122)

### Tips

- Recently used playlists appear under "Recents" in the Add to Playlist submenu
- Use `read_page` with `filter="interactive"` if coordinates aren't working
- Triple-click search box to select all text before typing new search
- Some underground artists may not be on Apple Music - skip and continue
