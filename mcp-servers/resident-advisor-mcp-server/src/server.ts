/**
 * Tool registrations for the Resident Advisor MCP server.
 *
 * buildServer() returns a fresh McpServer instance so the stateless HTTP
 * transport can create one per request (the SDK binds a server to a single
 * transport at a time).
 *
 * Two tool families:
 *  - ra_* tools: full API coverage for MCP clients (Claude, etc.)
 *  - search/fetch: the tool pair OpenAI requires for ChatGPT connectors
 *    and deep research (https://platform.openai.com/docs/mcp)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { errorText, raQuery, raUrl } from "./client.js";
import {
  enforceCharacterLimit,
  eventSummaryJson,
  eventSummaryMarkdown,
  formatDateTime,
} from "./format.js";
import {
  AREAS_BY_ID_QUERY,
  AREAS_QUERY,
  ARTIST_QUERY,
  EVENT_DETAIL_QUERY,
  EVENT_LISTINGS_QUERY,
  GENRES_QUERY,
  SEARCH_QUERY,
  VENUE_QUERY,
} from "./queries.js";
import type {
  RaArea,
  RaArtistDetail,
  RaEventDetail,
  RaEventListingsData,
  RaGenre,
  RaSearchResult,
  RaVenueDetail,
} from "./types.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

const responseFormatField = z
  .nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe(
    "Output format: 'markdown' for human-readable, 'json' for machine-readable",
  );

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/** Wrap a tool handler so any thrown error becomes a clean error response. */
function safe<TParams>(handler: (params: TParams) => Promise<ToolResult>) {
  return async (params: TParams): Promise<ToolResult> => {
    try {
      return await handler(params);
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: errorText(error) }],
        isError: true,
      };
    }
  };
}

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

// ---------------------------------------------------------------------------
// RA-native tools
// ---------------------------------------------------------------------------

function registerRaTools(server: McpServer): void {
  server.registerTool(
    "ra_search_areas",
    {
      title: "Search RA Areas (Cities/Regions)",
      description: `Find Resident Advisor area IDs by city or region name. An area ID is required by ra_find_events, so call this first when you only know a city name.

Args:
  - query (string): City or region name, e.g. "Berlin", "New York", "Tokyo"
  - limit (number): Max results, 1-20 (default: 5)

Returns: Matching areas with numeric id, name, URL slug, and country.

Example: query="Berlin" -> [{id: 34, name: "Berlin", country: "Germany"}]`,
      inputSchema: {
        query: z
          .string()
          .min(1)
          .max(100)
          .describe("City or region name to search for"),
        limit: z.number().int().min(1).max(20).default(5),
        response_format: responseFormatField,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(
      async (params: {
        query: string;
        limit: number;
        response_format: ResponseFormat;
      }) => {
        const data = await raQuery<{ areas: RaArea[] }>(AREAS_QUERY, {
          searchTerm: params.query,
          limit: params.limit,
        });
        const areas = data.areas ?? [];

        const output = {
          count: areas.length,
          areas: areas.map((a) => ({
            id: Number(a.id),
            name: a.name,
            url_name: a.urlName,
            country: a.country?.name ?? null,
            country_code: a.country?.urlCode ?? null,
          })),
        };

        if (areas.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No RA areas found matching '${params.query}'. Try a broader city name or the nearest major city.`,
              },
            ],
            structuredContent: output,
          };
        }

        let text: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# RA Areas matching '${params.query}'`, ""];
          for (const a of output.areas) {
            lines.push(
              `- **${a.name}**, ${a.country ?? "unknown country"} — area ID \`${a.id}\``,
            );
          }
          text = lines.join("\n");
        } else {
          text = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      },
    ),
  );

  server.registerTool(
    "ra_find_events",
    {
      title: "Find RA Events",
      description: `Find electronic music events listed on Resident Advisor for an area and date range. This is the main event-discovery tool.

Args:
  - area (number): RA area ID (get it from ra_search_areas, e.g. Berlin=34, London=13, Tokyo=27)
  - start_date (string): First listing date, YYYY-MM-DD
  - end_date (string): Last listing date, YYYY-MM-DD (inclusive)
  - genre (string, optional): Genre slug filter, e.g. "techno", "house", "drumandbass" (see ra_list_genres)
  - sort (string): "date" (chronological, default) or "popularity" (most interested first)
  - page (number): Page number, starts at 1 (default: 1)
  - page_size (number): Events per page, 1-50 (default: 20)

Returns: total_results plus a page of events, each with id, title, times, venue, lineup, genres, interested count, and ra.co URL. Use the event id with ra_get_event for full details.

Examples:
  - "What's on in Berlin this weekend?" -> area=34, start_date/end_date spanning the weekend
  - "Biggest techno night in London in September" -> area=13, genre="techno", sort="popularity"`,
      inputSchema: {
        area: z
          .number()
          .int()
          .positive()
          .describe("RA area ID from ra_search_areas"),
        start_date: z
          .string()
          .regex(DATE_PATTERN, "Use YYYY-MM-DD format")
          .describe("First listing date, YYYY-MM-DD"),
        end_date: z
          .string()
          .regex(DATE_PATTERN, "Use YYYY-MM-DD format")
          .describe("Last listing date (inclusive), YYYY-MM-DD"),
        genre: z
          .string()
          .max(50)
          .optional()
          .describe("Genre slug, e.g. 'techno' (see ra_list_genres)"),
        sort: z.enum(["date", "popularity"]).default("date"),
        page: z.number().int().min(1).default(1),
        page_size: z.number().int().min(1).max(50).default(20),
        response_format: responseFormatField,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(
      async (params: {
        area: number;
        start_date: string;
        end_date: string;
        genre?: string;
        sort: "date" | "popularity";
        page: number;
        page_size: number;
        response_format: ResponseFormat;
      }) => {
        if (params.end_date < params.start_date) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: end_date is before start_date. Swap them and retry.",
              },
            ],
          };
        }

        const { total, listings } = await findEvents({
          area: params.area,
          startDate: params.start_date,
          endDate: params.end_date,
          genre: params.genre,
          sort: params.sort,
          page: params.page,
          pageSize: params.page_size,
        });
        const hasMore = total > params.page * params.page_size;

        const output = {
          total_results: total,
          count: listings.length,
          page: params.page,
          page_size: params.page_size,
          has_more: hasMore,
          ...(hasMore ? { next_page: params.page + 1 } : {}),
          events: listings
            .map(eventSummaryJson)
            .filter((e): e is object => e !== null),
        };

        if (listings.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No events found for area ${params.area} between ${params.start_date} and ${params.end_date}${params.genre ? ` with genre '${params.genre}'` : ""}. Widen the date range, drop the genre filter, or verify the area ID with ra_search_areas.`,
              },
            ],
            structuredContent: output,
          };
        }

        let text: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# RA Events: area ${params.area}, ${params.start_date} to ${params.end_date}`,
            "",
            `Found ${total} events (showing ${listings.length}, page ${params.page}${hasMore ? `; more available on page ${params.page + 1}` : ""})`,
            "",
          ];
          for (const listing of listings) {
            if (!listing.event) continue;
            lines.push(...eventSummaryMarkdown(listing.event), "");
          }
          text = enforceCharacterLimit(
            lines.join("\n"),
            "Reduce page_size or add a genre filter to see fewer events per page.",
          );
        } else {
          text = enforceCharacterLimit(
            JSON.stringify(output, null, 2),
            "Reduce page_size or add a genre filter.",
          );
        }

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      },
    ),
  );

  server.registerTool(
    "ra_get_event",
    {
      title: "Get RA Event Details",
      description: `Get full details for one Resident Advisor event by its numeric ID (from ra_find_events, ra_search, or an ra.co/events/<id> URL).

Args:
  - event_id (number): RA event ID, e.g. 2507884

Returns: Title, description, dates/times, cost, minimum age, full lineup with artist IDs, venue with address, promoters, genres, interested count, flyer image URL, and ra.co URL.`,
      inputSchema: {
        event_id: z.number().int().positive().describe("RA event ID"),
        response_format: responseFormatField,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(
      async (params: { event_id: number; response_format: ResponseFormat }) => {
        const event = await getEventDetail(params.event_id);
        if (!event) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: No event found with ID ${params.event_id}. Check the ID (the number in ra.co/events/<id>).`,
              },
            ],
          };
        }

        const output = eventDetailJson(event);

        const text =
          params.response_format === ResponseFormat.MARKDOWN
            ? enforceCharacterLimit(
                eventDetailMarkdown(event),
                "The event description was very long.",
              )
            : JSON.stringify(output, null, 2);

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      },
    ),
  );

  server.registerTool(
    "ra_search",
    {
      title: "Search Resident Advisor",
      description: `Global keyword search across Resident Advisor: events, artists, clubs/venues, promoters, labels, and areas. Use this to resolve a name ("Berghain", "Ellen Allien", "Dekmantel") to RA IDs and URLs.

Args:
  - query (string): Search term
  - types (string[], optional): Restrict to result types, any of EVENT, ARTIST, CLUB, PROMOTER, LABEL, AREA (default: all)
  - limit (number): Max results, 1-30 (default: 10)

Returns: Results with type, id, name, location, and ra.co URL. CLUB results are venues usable with ra_get_venue; ARTIST results work with ra_get_artist; EVENT results work with ra_get_event.`,
      inputSchema: {
        query: z.string().min(1).max(200).describe("Search term"),
        types: z
          .array(z.enum(SEARCH_INDICES))
          .optional()
          .describe("Result types to include (default: all)"),
        limit: z.number().int().min(1).max(30).default(10),
        response_format: responseFormatField,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(
      async (params: {
        query: string;
        types?: (typeof SEARCH_INDICES)[number][];
        limit: number;
        response_format: ResponseFormat;
      }) => {
        const results = await globalSearch(
          params.query,
          params.types ?? [...SEARCH_INDICES],
          params.limit,
        );

        const output = {
          count: results.length,
          results: results.map((r) => ({
            type: r.searchType,
            id: r.id,
            name: r.value,
            area: r.areaName,
            country: r.countryName,
            url: raUrl(r.contentUrl),
          })),
        };

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No RA results for '${params.query}'. Try a shorter or differently spelled term.`,
              },
            ],
            structuredContent: output,
          };
        }

        let text: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [`# RA Search: '${params.query}'`, ""];
          for (const r of output.results) {
            const location = [r.area, r.country].filter(Boolean).join(", ");
            lines.push(
              `- **${r.name}** [${r.type}, id ${r.id}]${location ? ` — ${location}` : ""}${r.url ? ` — ${r.url}` : ""}`,
            );
          }
          text = lines.join("\n");
        } else {
          text = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      },
    ),
  );

  server.registerTool(
    "ra_get_artist",
    {
      title: "Get RA Artist Profile",
      description: `Get a Resident Advisor artist profile by numeric ID or URL slug.

Args:
  - artist_id (number, optional): RA artist ID (from ra_search or event lineups)
  - slug (string, optional): URL slug from ra.co/dj/<slug>, e.g. "ellenallien"
  Provide exactly one of artist_id or slug.

Returns: Name, follower count, country, bio blurb, social/web links, and ra.co URL.`,
      inputSchema: {
        artist_id: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("RA artist ID"),
        slug: z
          .string()
          .max(100)
          .optional()
          .describe("Artist URL slug from ra.co/dj/<slug>"),
        response_format: responseFormatField,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(
      async (params: {
        artist_id?: number;
        slug?: string;
        response_format: ResponseFormat;
      }) => {
        if (!params.artist_id && !params.slug) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: Provide either artist_id or slug.",
              },
            ],
          };
        }

        const artist = await getArtistDetail(
          params.artist_id ? { id: params.artist_id } : { slug: params.slug },
        );
        if (!artist) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: No artist found for ${params.artist_id ? `ID ${params.artist_id}` : `slug '${params.slug}'`}. Try ra_search with the artist name.`,
              },
            ],
          };
        }

        const output = artistJson(artist);

        let text: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          text = artistMarkdown(artist);
        } else {
          text = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      },
    ),
  );

  server.registerTool(
    "ra_get_venue",
    {
      title: "Get RA Venue Details",
      description: `Get details for a club/venue on Resident Advisor by numeric ID (from ra_search CLUB results, event listings, or an ra.co/clubs/<id> URL).

Args:
  - venue_id (number): RA venue ID, e.g. 185172

Returns: Name, address, area/country, description, capacity, follower count, website/phone, events this year, most-booked artists, and ra.co URL.`,
      inputSchema: {
        venue_id: z.number().int().positive().describe("RA venue ID"),
        response_format: responseFormatField,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(
      async (params: { venue_id: number; response_format: ResponseFormat }) => {
        const venue = await getVenueDetail(params.venue_id);
        if (!venue) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: No venue found with ID ${params.venue_id}. Check the ID (the number in ra.co/clubs/<id>), or find it via ra_search with types=["CLUB"].`,
              },
            ],
          };
        }

        const output = venueJson(venue);

        const text =
          params.response_format === ResponseFormat.MARKDOWN
            ? venueMarkdown(venue)
            : JSON.stringify(output, null, 2);

        return {
          content: [{ type: "text" as const, text }],
          structuredContent: output,
        };
      },
    ),
  );

  server.registerTool(
    "ra_list_genres",
    {
      title: "List RA Genres",
      description: `List all genres known to Resident Advisor with the slug values accepted by ra_find_events' genre filter.

Args: none (response_format only)

Returns: All genres with name and slug (e.g. name "Drum & Bass" -> slug "drumandbass").`,
      inputSchema: {
        response_format: responseFormatField,
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(async (params: { response_format: ResponseFormat }) => {
      const data = await raQuery<{ genres: RaGenre[] }>(GENRES_QUERY);
      const genres = (data.genres ?? []).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const output = {
        count: genres.length,
        genres: genres.map((g) => ({ name: g.name, slug: g.slug })),
      };

      let text: string;
      if (params.response_format === ResponseFormat.MARKDOWN) {
        const lines = [`# RA Genres (${genres.length})`, ""];
        for (const g of genres) {
          lines.push(`- ${g.name} — slug \`${g.slug}\``);
        }
        text = lines.join("\n");
      } else {
        text = JSON.stringify(output, null, 2);
      }

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: output,
      };
    }),
  );
}

// ---------------------------------------------------------------------------
// OpenAI-compatible search/fetch tools
//
// ChatGPT connectors and deep research require exactly two tools named
// `search` and `fetch`. `search` returns {results: [{id, title, text, url}]}
// and `fetch` returns {id, title, text, url, metadata}, both as JSON text.
// Document IDs are namespaced: "event:123", "artist:617", "venue:5031",
// "area:34".
// ---------------------------------------------------------------------------

const SEARCH_INDICES = [
  "EVENT",
  "ARTIST",
  "CLUB",
  "PROMOTER",
  "LABEL",
  "AREA",
] as const;

const OPENAI_SEARCH_INDICES = ["EVENT", "ARTIST", "CLUB", "AREA"];

const SEARCH_TYPE_TO_DOC: Record<string, string> = {
  UPCOMINGEVENT: "event",
  EVENT: "event",
  ARTIST: "artist",
  VENUE: "venue",
  CLUB: "venue",
  AREA: "area",
};

function registerOpenAiTools(server: McpServer): void {
  server.registerTool(
    "search",
    {
      title: "Search Resident Advisor",
      description:
        "Search Resident Advisor (ra.co) for electronic music events, artists, clubs/venues, and cities. Returns a list of results with document IDs for the fetch tool. Use short keyword queries like an artist name ('Alix Perez'), a club ('Berghain'), an event or festival name ('Dekmantel'), or a city ('Tokyo').",
      inputSchema: {
        query: z.string().min(1).max(200).describe("Search keywords"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(async (params: { query: string }) => {
      const raw = await globalSearch(params.query, OPENAI_SEARCH_INDICES, 12);
      const results = raw.flatMap((r) => {
        const docType = SEARCH_TYPE_TO_DOC[r.searchType];
        if (!docType) return [];
        const location = [r.areaName, r.countryName]
          .filter(Boolean)
          .join(", ");
        return [
          {
            id: `${docType}:${r.id}`,
            title: `${r.value}${location ? ` (${docType}, ${location})` : ` (${docType})`}`,
            text: `Resident Advisor ${docType}: ${r.value}${location ? ` — ${location}` : ""}`,
            url: raUrl(r.contentUrl),
          },
        ];
      });
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ results }) },
        ],
        structuredContent: { results },
      };
    }),
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch Resident Advisor Document",
      description:
        "Fetch full details for one Resident Advisor document by ID from the search tool. ID formats: 'event:<id>' (event with lineup, venue, times), 'artist:<id>' (profile and bio), 'venue:<id>' (club details), 'area:<id>' (city with its most popular upcoming events in the next 30 days).",
      inputSchema: {
        id: z
          .string()
          .regex(
            /^(event|artist|venue|area):\d+$/,
            "ID must look like 'event:123', 'artist:617', 'venue:5031', or 'area:34'",
          )
          .describe("Document ID from the search tool"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    safe(async (params: { id: string }) => {
      const [docType, rawId] = params.id.split(":");
      const numericId = Number(rawId);
      const document = await fetchDocument(docType, numericId, params.id);
      if (!document) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: No ${docType} found with ID ${numericId}. Use the search tool to find valid document IDs.`,
            },
          ],
          isError: true,
        };
      }
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(document) },
        ],
        structuredContent: document,
      };
    }),
  );
}

interface OpenAiDocument {
  id: string;
  title: string;
  text: string;
  url: string | null;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

async function fetchDocument(
  docType: string,
  numericId: number,
  documentId: string,
): Promise<OpenAiDocument | null> {
  switch (docType) {
    case "event": {
      const event = await getEventDetail(numericId);
      if (!event) return null;
      return {
        id: documentId,
        title: event.title,
        text: eventDetailMarkdown(event),
        url: raUrl(event.contentUrl),
        metadata: eventDetailJson(event),
      };
    }
    case "artist": {
      const artist = await getArtistDetail({ id: numericId });
      if (!artist) return null;
      return {
        id: documentId,
        title: artist.name,
        text: artistMarkdown(artist),
        url: raUrl(artist.contentUrl),
        metadata: artistJson(artist),
      };
    }
    case "venue": {
      const venue = await getVenueDetail(numericId);
      if (!venue) return null;
      return {
        id: documentId,
        title: venue.name,
        text: venueMarkdown(venue),
        url: raUrl(venue.contentUrl),
        metadata: venueJson(venue),
      };
    }
    case "area": {
      const data = await raQuery<{ areas: RaArea[] }>(AREAS_BY_ID_QUERY, {
        ids: [numericId],
      });
      const area = data.areas?.[0];
      if (!area) return null;

      const today = new Date();
      const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const toIso = (d: Date): string => d.toISOString().slice(0, 10);
      const { total, listings } = await findEvents({
        area: numericId,
        startDate: toIso(today),
        endDate: toIso(end),
        sort: "popularity",
        page: 1,
        pageSize: 10,
      });

      const lines = [
        `${area.name}, ${area.country?.name ?? "unknown country"} (RA area ${area.id})`,
        "",
        `${total} events listed in the next 30 days. Most popular:`,
        "",
      ];
      for (const listing of listings) {
        if (!listing.event) continue;
        lines.push(...eventSummaryMarkdown(listing.event), "");
      }
      return {
        id: documentId,
        title: `${area.name}, ${area.country?.name ?? ""}`.trim(),
        text: lines.join("\n"),
        url: area.urlName ? `https://ra.co/events/${area.urlName}` : null,
        metadata: {
          area_id: Number(area.id),
          name: area.name,
          country: area.country?.name ?? null,
          upcoming_event_count: total,
        },
      };
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Shared data access + formatting (used by both tool families)
// ---------------------------------------------------------------------------

async function findEvents(options: {
  area: number;
  startDate: string;
  endDate: string;
  genre?: string;
  sort: "date" | "popularity";
  page: number;
  pageSize: number;
}): Promise<{
  total: number;
  listings: RaEventListingsData["eventListings"]["data"];
}> {
  const filters: Record<string, unknown> = {
    areas: { eq: options.area },
    listingDate: { gte: options.startDate, lte: options.endDate },
  };
  if (options.genre) {
    filters.genre = { eq: options.genre.toLowerCase() };
  }
  const sort =
    options.sort === "popularity"
      ? { attending: { order: "DESCENDING" } }
      : { listingDate: { order: "ASCENDING" } };

  const data = await raQuery<RaEventListingsData>(EVENT_LISTINGS_QUERY, {
    filters,
    page: options.page,
    pageSize: options.pageSize,
    sort,
  });
  return {
    total: data.eventListings.totalResults,
    listings: data.eventListings.data.filter((l) => l.event !== null),
  };
}

async function getEventDetail(eventId: number): Promise<RaEventDetail | null> {
  const data = await raQuery<{ event: RaEventDetail | null }>(
    EVENT_DETAIL_QUERY,
    { id: eventId },
  );
  return data.event;
}

async function getArtistDetail(by: {
  id?: number;
  slug?: string;
}): Promise<RaArtistDetail | null> {
  const data = await raQuery<{ artist: RaArtistDetail | null }>(
    ARTIST_QUERY,
    by.id !== undefined ? { id: by.id } : { slug: by.slug },
  );
  return data.artist;
}

async function getVenueDetail(venueId: number): Promise<RaVenueDetail | null> {
  const data = await raQuery<{ venue: RaVenueDetail | null }>(VENUE_QUERY, {
    id: venueId,
  });
  return data.venue;
}

async function globalSearch(
  searchTerm: string,
  indices: readonly string[],
  limit: number,
): Promise<RaSearchResult[]> {
  const data = await raQuery<{ search: RaSearchResult[] }>(SEARCH_QUERY, {
    searchTerm,
    limit,
    indices: [...indices],
  });
  return data.search ?? [];
}

function eventDetailJson(event: RaEventDetail): Record<string, unknown> {
  return {
    id: event.id,
    title: event.title,
    description: event.content || null,
    start_time: event.startTime,
    end_time: event.endTime,
    cost: event.cost || null,
    minimum_age: event.minimumAge,
    is_ticketed: event.isTicketed ?? false,
    is_festival: event.isFestival ?? false,
    interested_count: event.attending,
    genres: (event.genres ?? []).map((g) => g.name),
    lineup: (event.artists ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      url: raUrl(a.contentUrl),
    })),
    venue: event.venue
      ? {
          id: event.venue.id,
          name: event.venue.name,
          address: event.venue.address,
          area: event.venue.area?.name ?? null,
          country: event.venue.area?.country?.name ?? null,
          url: raUrl(event.venue.contentUrl),
        }
      : null,
    promoters: (event.promoters ?? []).map((p) => p.name),
    flyer_url: event.flyerFront || null,
    url: raUrl(event.contentUrl),
  };
}

function eventDetailMarkdown(event: RaEventDetail): string {
  const lines = [`# ${event.title}`, ""];
  lines.push(
    `- **When**: ${formatDateTime(event.startTime)} → ${formatDateTime(event.endTime)}`,
  );
  if (event.venue) {
    const location = [
      event.venue.area?.name,
      event.venue.area?.country?.name,
    ]
      .filter(Boolean)
      .join(", ");
    lines.push(
      `- **Venue**: ${event.venue.name}${event.venue.address ? `, ${event.venue.address}` : ""}${location ? ` (${location})` : ""}`,
    );
  }
  if (event.cost) lines.push(`- **Cost**: ${event.cost}`);
  if (event.minimumAge) lines.push(`- **Minimum age**: ${event.minimumAge}`);
  const genres = (event.genres ?? []).map((g) => g.name);
  if (genres.length > 0) lines.push(`- **Genres**: ${genres.join(", ")}`);
  lines.push(`- **Interested**: ${event.attending}`);
  const promoters = (event.promoters ?? []).map((p) => p.name);
  if (promoters.length > 0)
    lines.push(`- **Promoters**: ${promoters.join(", ")}`);
  const url = raUrl(event.contentUrl);
  if (url) lines.push(`- **URL**: ${url}`);
  const artists = event.artists ?? [];
  if (artists.length > 0) {
    lines.push("", "## Lineup");
    for (const artist of artists) {
      lines.push(`- ${artist.name} (artist ${artist.id})`);
    }
  }
  if (event.content) {
    lines.push("", "## Description", event.content);
  }
  return lines.join("\n");
}

function artistJson(artist: RaArtistDetail): Record<string, unknown> {
  const links: Record<string, string | null> = {
    soundcloud: artist.soundcloud,
    instagram: artist.instagram,
    twitter: artist.twitter,
    facebook: artist.facebook,
    website: artist.website,
  };
  return {
    id: artist.id,
    name: artist.name,
    follower_count: artist.followerCount,
    country: artist.country?.name ?? null,
    bio: artist.biography?.blurb || null,
    links: Object.fromEntries(
      Object.entries(links).filter(([, v]) => Boolean(v)),
    ),
    url: raUrl(artist.contentUrl),
  };
}

function artistMarkdown(artist: RaArtistDetail): string {
  const output = artistJson(artist);
  const lines = [`# ${artist.name} (artist ${artist.id})`, ""];
  if (output.country) lines.push(`- **Country**: ${output.country}`);
  if (artist.followerCount !== null)
    lines.push(`- **RA followers**: ${artist.followerCount}`);
  if (output.url) lines.push(`- **URL**: ${output.url}`);
  for (const [name, url] of Object.entries(
    output.links as Record<string, string>,
  )) {
    lines.push(`- **${name[0].toUpperCase()}${name.slice(1)}**: ${url}`);
  }
  if (artist.biography?.blurb) lines.push("", "## Bio", artist.biography.blurb);
  return lines.join("\n");
}

function venueJson(venue: RaVenueDetail): Record<string, unknown> {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address || null,
    area: venue.area?.name ?? null,
    country: venue.area?.country?.name ?? null,
    area_id: venue.area ? Number(venue.area.id) : null,
    description: venue.blurb || null,
    capacity: venue.capacity && venue.capacity !== "0" ? venue.capacity : null,
    follower_count: venue.followerCount,
    website: venue.website || null,
    phone: venue.phone || null,
    event_count_this_year: venue.eventCountThisYear,
    top_artists: (venue.topArtists ?? []).map((a) => a.name),
    url: raUrl(venue.contentUrl),
  };
}

function venueMarkdown(venue: RaVenueDetail): string {
  const output = venueJson(venue);
  const lines = [`# ${venue.name} (venue ${venue.id})`, ""];
  if (output.address) lines.push(`- **Address**: ${output.address}`);
  const location = [output.area, output.country].filter(Boolean).join(", ");
  if (location)
    lines.push(`- **Location**: ${location} (area ID ${output.area_id})`);
  if (output.capacity) lines.push(`- **Capacity**: ${output.capacity}`);
  if (venue.followerCount !== null)
    lines.push(`- **RA followers**: ${venue.followerCount}`);
  if (venue.eventCountThisYear !== null)
    lines.push(`- **Events this year**: ${venue.eventCountThisYear}`);
  if (output.website) lines.push(`- **Website**: ${output.website}`);
  if (output.url) lines.push(`- **URL**: ${output.url}`);
  const topArtists = (venue.topArtists ?? []).map((a) => a.name);
  if (topArtists.length > 0)
    lines.push(`- **Most booked artists**: ${topArtists.join(", ")}`);
  if (venue.blurb) lines.push("", "## About", venue.blurb);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export function buildServer(): McpServer {
  const server = new McpServer({
    name: "resident-advisor-mcp-server",
    version: "1.1.0",
  });
  registerRaTools(server);
  registerOpenAiTools(server);
  return server;
}
