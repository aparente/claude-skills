/**
 * GraphQL queries for the Resident Advisor API.
 * All queries verified against the live ra.co/graphql schema.
 */

export const AREAS_QUERY = `
query SearchAreas($searchTerm: String, $limit: Int) {
  areas(searchTerm: $searchTerm, limit: $limit) {
    id
    name
    urlName
    country {
      name
      urlCode
    }
  }
}`;

export const EVENT_LISTINGS_QUERY = `
query EventListings(
  $filters: FilterInputDtoInput
  $page: Int
  $pageSize: Int
  $sort: SortInputDtoInput
) {
  eventListings(filters: $filters, page: $page, pageSize: $pageSize, sort: $sort) {
    totalResults
    data {
      listingDate
      event {
        id
        title
        date
        startTime
        endTime
        contentUrl
        attending
        isTicketed
        isFestival
        cost
        genres {
          name
          slug
        }
        venue {
          id
          name
          contentUrl
        }
        artists {
          id
          name
        }
      }
    }
  }
}`;

export const EVENT_DETAIL_QUERY = `
query EventDetail($id: ID) {
  event(id: $id) {
    id
    title
    content
    date
    startTime
    endTime
    cost
    minimumAge
    isTicketed
    isFestival
    attending
    contentUrl
    flyerFront
    genres {
      name
      slug
    }
    artists {
      id
      name
      contentUrl
    }
    venue {
      id
      name
      address
      contentUrl
      area {
        id
        name
        country {
          name
          urlCode
        }
      }
    }
    promoters {
      id
      name
    }
  }
}`;

export const SEARCH_QUERY = `
query GlobalSearch($searchTerm: String, $limit: Int, $indices: [IndexType!]) {
  search(searchTerm: $searchTerm, limit: $limit, indices: $indices) {
    searchType
    id
    value
    areaName
    countryName
    contentUrl
  }
}`;

export const ARTIST_QUERY = `
query ArtistDetail($id: ID, $slug: String) {
  artist(id: $id, slug: $slug) {
    id
    name
    followerCount
    contentUrl
    country {
      name
      urlCode
    }
    soundcloud
    instagram
    twitter
    facebook
    website
    biography {
      blurb
    }
  }
}`;

export const VENUE_QUERY = `
query VenueDetail($id: ID) {
  venue(id: $id) {
    id
    name
    address
    phone
    website
    blurb
    followerCount
    capacity
    contentUrl
    eventCountThisYear
    area {
      id
      name
      urlName
      country {
        name
        urlCode
      }
    }
    topArtists {
      name
    }
  }
}`;

export const GENRES_QUERY = `
query Genres {
  genres {
    id
    name
    slug
  }
}`;
