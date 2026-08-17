# resident-advisor-mcp-server

MCP server for finding electronic music events on [Resident Advisor](https://ra.co). It talks to the same GraphQL API the ra.co website uses. No API key needed. All tools are read-only.

## Tools

| Tool | What it does |
|------|--------------|
| `ra_search_areas` | Find the numeric area ID for a city ("Berlin" → 34) |
| `ra_find_events` | List events for an area and date range. Filter by genre, sort by date or popularity, paginate |
| `ra_get_event` | Full event details: lineup, venue, cost, age limit, description |
| `ra_search` | Keyword search across events, artists, clubs, promoters, labels, areas |
| `ra_get_artist` | Artist profile by ID or slug: bio, followers, links |
| `ra_get_venue` | Venue details: address, capacity, most-booked artists |
| `ra_list_genres` | All genre slugs accepted by the event filter |

The usual flow: `ra_search_areas` to get an area ID, then `ra_find_events` for the listings, then `ra_get_event` for anything that looks good.

## Setup

Build:

```bash
bun install
bun run build
```

Add to a project `.mcp.json` (Claude Code) or `claude_desktop_config.json` (Claude Desktop):

```json
{
  "mcpServers": {
    "resident-advisor": {
      "command": "node",
      "args": ["/absolute/path/to/resident-advisor-mcp-server/dist/index.js"]
    }
  }
}
```

## Example prompts

- "What's on in Berlin this weekend?"
- "Find the biggest techno night in London in September."
- "Who is playing at Berghain next Saturday?"
- "Tell me about the venue RSO.BERLIN."

## Notes

- RA does not publish this API. It can change or block traffic without warning. Requests send browser-like headers; a 403 usually means Cloudflare is rate-limiting the IP.
- Dates use the area's local time zone, as shown on ra.co.
- Every tool takes `response_format`: `"markdown"` (default) or `"json"`. Structured content is returned either way.
