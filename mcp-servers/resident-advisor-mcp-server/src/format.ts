/** Shared formatting helpers for tool responses. */

import { raUrl } from "./client.js";
import type { RaEventListing, RaEventSummary } from "./types.js";

/** Maximum characters in a tool response before truncation kicks in. */
export const CHARACTER_LIMIT = 25_000;

/** Max artists to name per event in markdown listings. */
const MAX_ARTISTS_SHOWN = 8;

/**
 * Format an RA LocalDateTime string ("2026-08-16T14:00:00.000") as a
 * compact human-readable string ("Sun 16 Aug 2026, 14:00").
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const hasTime = value.includes("T") && !value.includes("T00:00:00");
  if (!hasTime) return day;
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day}, ${time}`;
}

/** Render one event as markdown lines (used by listings and detail). */
export function eventSummaryMarkdown(event: RaEventSummary): string[] {
  const lines: string[] = [];
  lines.push(`## ${event.title} (event ${event.id})`);
  lines.push(
    `- **When**: ${formatDateTime(event.startTime)} → ${formatDateTime(event.endTime)}`,
  );
  if (event.venue) {
    lines.push(`- **Venue**: ${event.venue.name} (venue ${event.venue.id})`);
  }
  const artists = event.artists ?? [];
  if (artists.length > 0) {
    const shown = artists.slice(0, MAX_ARTISTS_SHOWN).map((a) => a.name);
    const extra = artists.length - shown.length;
    lines.push(
      `- **Lineup**: ${shown.join(", ")}${extra > 0 ? ` (+${extra} more)` : ""}`,
    );
  }
  const genres = (event.genres ?? []).map((g) => g.name);
  if (genres.length > 0) {
    lines.push(`- **Genres**: ${genres.join(", ")}`);
  }
  lines.push(`- **Interested**: ${event.attending}`);
  if (event.cost) {
    lines.push(`- **Cost**: ${event.cost}`);
  }
  const flags: string[] = [];
  if (event.isFestival) flags.push("festival");
  if (event.isTicketed) flags.push("ticketed on RA");
  if (flags.length > 0) lines.push(`- **Type**: ${flags.join(", ")}`);
  const url = raUrl(event.contentUrl);
  if (url) lines.push(`- **URL**: ${url}`);
  return lines;
}

/** Structured JSON shape for one event in listings output. */
export function eventSummaryJson(listing: RaEventListing): object | null {
  const event = listing.event;
  if (!event) return null;
  return {
    id: event.id,
    title: event.title,
    listing_date: listing.listingDate,
    start_time: event.startTime,
    end_time: event.endTime,
    venue: event.venue
      ? { id: event.venue.id, name: event.venue.name }
      : null,
    artists: (event.artists ?? []).map((a) => ({ id: a.id, name: a.name })),
    genres: (event.genres ?? []).map((g) => g.name),
    interested_count: event.attending,
    is_ticketed: event.isTicketed ?? false,
    is_festival: event.isFestival ?? false,
    cost: event.cost || null,
    url: raUrl(event.contentUrl),
  };
}

/**
 * Truncate a markdown body if it exceeds CHARACTER_LIMIT, appending a hint.
 */
export function enforceCharacterLimit(text: string, hint: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return `${text.slice(0, CHARACTER_LIMIT)}\n\n---\n**Response truncated at ${CHARACTER_LIMIT} characters.** ${hint}`;
}
