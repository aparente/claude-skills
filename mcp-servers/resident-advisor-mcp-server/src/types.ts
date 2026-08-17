/** Response types for the subset of the RA GraphQL schema this server uses. */

export interface RaCountry {
  name: string;
  urlCode: string | null;
}

export interface RaArea {
  id: string;
  name: string;
  urlName: string | null;
  country: RaCountry | null;
}

export interface RaGenre {
  id?: string;
  name: string;
  slug: string | null;
}

export interface RaArtistRef {
  id: string;
  name: string;
  contentUrl?: string | null;
}

export interface RaVenueRef {
  id: string;
  name: string;
  contentUrl: string | null;
}

export interface RaEventSummary {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  contentUrl: string | null;
  attending: number;
  isTicketed: boolean | null;
  isFestival: boolean | null;
  cost: string | null;
  genres: RaGenre[] | null;
  venue: RaVenueRef | null;
  artists: RaArtistRef[] | null;
}

export interface RaEventListing {
  listingDate: string;
  event: RaEventSummary | null;
}

export interface RaEventListingsData {
  eventListings: {
    totalResults: number;
    data: RaEventListing[];
  };
}

export interface RaEventDetail extends RaEventSummary {
  content: string | null;
  minimumAge: number | null;
  flyerFront: string | null;
  venue:
    | (RaVenueRef & {
        address: string | null;
        area: (Omit<RaArea, "urlName"> & { urlName?: string | null }) | null;
      })
    | null;
  promoters: { id: string; name: string }[] | null;
}

export interface RaSearchResult {
  searchType: string;
  id: string;
  value: string;
  areaName: string | null;
  countryName: string | null;
  contentUrl: string | null;
}

export interface RaArtistDetail {
  id: string;
  name: string;
  followerCount: number | null;
  contentUrl: string | null;
  country: RaCountry | null;
  soundcloud: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
  website: string | null;
  biography: { blurb: string | null } | null;
}

export interface RaVenueDetail {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  blurb: string | null;
  followerCount: number | null;
  capacity: string | null;
  contentUrl: string | null;
  eventCountThisYear: number | null;
  area: RaArea | null;
  topArtists: { name: string }[] | null;
}
