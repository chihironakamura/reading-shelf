import { NextResponse } from "next/server";
import {
  normalizeOsmRestaurants,
  OverpassElement,
  OverpassResponse,
} from "@/lib/places";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const OVERPASS_TIMEOUT_SECONDS = 6;
const REQUEST_TIMEOUT_MS = 7_000;
const RESULT_LIMIT = 80;
const FALLBACK_RESULT_LIMIT = 40;
const ENOUGH_RESULTS = 8;

type SearchRequest = {
  query?: unknown;
  radiusKm?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type ElementSelector = "nwr" | "node";

type SearchProfile = {
  pattern: RegExp;
  filters: string[];
};

const searchProfiles: SearchProfile[] = [
  {
    pattern: /(ラーメン|らーめん|中華そば|ramen)/i,
    filters: [
      '[amenity~"^(restaurant|fast_food)$"][cuisine~"(ramen|noodle|noodles)",i]',
    ],
  },
  {
    pattern: /(焼肉|やきにく|yakiniku|bbq|barbecue)/i,
    filters: [
      '[amenity="restaurant"][cuisine~"(yakiniku|bbq|barbecue|korean)",i]',
    ],
  },
  {
    pattern: /(カフェ|cafe)/i,
    filters: [
      '[amenity="cafe"]',
      '[shop="coffee"]',
      '[amenity="restaurant"][cuisine~"(cafe|coffee|coffee_shop)",i]',
    ],
  },
  {
    pattern: /(コーヒー|珈琲|coffee)/i,
    filters: [
      '[shop="coffee"]',
      '[amenity="cafe"]',
      '[amenity~"^(cafe|restaurant)$"][cuisine~"(coffee|coffee_shop)",i]',
    ],
  },
  {
    pattern: /(弁当|お弁当|惣菜|デリ|テイクアウト|持ち帰り|bento|deli)/i,
    filters: [
      '[shop="deli"]',
      '[amenity="fast_food"][takeaway~"^(yes|only)$"]',
      '[amenity~"^(restaurant|fast_food)$"][cuisine~"(bento|deli|takeaway)",i]',
    ],
  },
  {
    pattern: /(スパイスカレー|スパイス|カレー|curry)/i,
    filters: [
      '[amenity~"^(restaurant|fast_food)$"][cuisine~"(curry|indian|nepalese|sri_lankan)",i]',
    ],
  },
  {
    pattern: /(寿司|鮨|すし|sushi)/i,
    filters: ['[amenity~"^(restaurant|fast_food)$"][cuisine~"sushi",i]'],
  },
  {
    pattern: /(パン|ベーカリー|bakery|bread)/i,
    filters: ['[shop="bakery"]'],
  },
];

const defaultFilters = [
  '[amenity~"^(restaurant|cafe|fast_food)$"]',
  '[shop~"^(coffee|bakery|deli)$"]',
];

function searchRadii(radiusKm: number) {
  return [1, 3, 5].filter((radius) => radius <= radiusKm);
}

function filtersForQuery(searchQuery: string) {
  return searchProfiles.find((profile) => profile.pattern.test(searchQuery))?.filters ?? defaultFilters;
}

function overpassQuery(
  latitude: number,
  longitude: number,
  radiusKm: number,
  searchQuery: string,
  fallback = false,
) {
  const selector: ElementSelector = fallback ? "node" : "nwr";
  const around = `around:${radiusKm * 1000},${latitude},${longitude}`;
  const filters = filtersForQuery(searchQuery);
  const activeFilters = fallback ? filters.slice(0, 1) : filters.slice(0, 3);
  const clauses = activeFilters
    .map((filter) => `${selector}(${around})${filter};`)
    .join("\n      ");
  const limit = fallback ? FALLBACK_RESULT_LIMIT : RESULT_LIMIT;

  return `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];
    (
      ${clauses}
    );
    out center tags ${limit};`;
}

async function fetchOverpass(query: string, endpoint: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "KyouNoGohan/1.0",
    },
    body: new URLSearchParams({ data: query }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Overpass API returned ${response.status}`);
  return (await response.json()) as OverpassResponse;
}

async function searchRadius(
  latitude: number,
  longitude: number,
  radiusKm: number,
  searchQuery: string,
  stageIndex: number,
) {
  const primaryEndpoint = OVERPASS_ENDPOINTS[stageIndex % OVERPASS_ENDPOINTS.length];
  const fallbackEndpoint = OVERPASS_ENDPOINTS[(stageIndex + 1) % OVERPASS_ENDPOINTS.length];

  try {
    return await fetchOverpass(
      overpassQuery(latitude, longitude, radiusKm, searchQuery),
      primaryEndpoint,
    );
  } catch (primaryError) {
    console.warn(`Overpass ${radiusKm}km search failed; trying fallback`, primaryError);
    return fetchOverpass(
      overpassQuery(latitude, longitude, radiusKm, searchQuery, true),
      fallbackEndpoint,
    );
  }
}

function mergeElements(current: OverpassElement[], incoming: OverpassElement[]) {
  const elements = new Map(current.map((element) => [`${element.type}/${element.id}`, element]));
  for (const element of incoming) elements.set(`${element.type}/${element.id}`, element);
  return [...elements.values()];
}

export async function POST(request: Request) {
  let body: SearchRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "検索条件を読み取れませんでした。" }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim().slice(0, 80) : "";
  const radiusKm = Number(body.radiusKm);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (![1, 3, 5].includes(radiusKm)) {
    return NextResponse.json({ error: "検索半径を確認してください。" }, { status: 400 });
  }

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "現在地の情報が正しくありません。" }, { status: 400 });
  }

  const origin = { latitude, longitude };
  let elements: OverpassElement[] = [];
  let lastError: unknown;

  for (const [stageIndex, stageRadiusKm] of searchRadii(radiusKm).entries()) {
    try {
      const data = await searchRadius(latitude, longitude, stageRadiusKm, query, stageIndex);
      elements = mergeElements(elements, data.elements ?? []);
      const restaurants = normalizeOsmRestaurants(elements, origin, query)
        .filter((restaurant) => restaurant.distanceKm <= radiusKm);

      if (restaurants.length >= ENOUGH_RESULTS || stageRadiusKm === radiusKm) {
        return NextResponse.json({ restaurants });
      }
    } catch (error) {
      lastError = error;
      console.warn(`Overpass ${stageRadiusKm}km fallback failed`, error);

      if (elements.length > 0) {
        const restaurants = normalizeOsmRestaurants(elements, origin, query)
          .filter((restaurant) => restaurant.distanceKm <= radiusKm);
        return NextResponse.json({ restaurants });
      }
      break;
    }
  }

  if (elements.length > 0) {
    const restaurants = normalizeOsmRestaurants(elements, origin, query)
      .filter((restaurant) => restaurant.distanceKm <= radiusKm);
    return NextResponse.json({ restaurants });
  }

  console.error("Overpass request failed after staged search", lastError);
  return NextResponse.json(
    { error: "検索が混み合っています。条件を変えてもう一度お試しください" },
    { status: 502 },
  );
}
