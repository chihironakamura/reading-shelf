import { NextResponse } from "next/server";
import { normalizeOsmRestaurants, OverpassResponse } from "@/lib/places";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const OVERPASS_TIMEOUT_SECONDS = 8;
const REQUEST_TIMEOUT_MS = 10_000;
const PRIMARY_RESULT_LIMIT = 180;
const FALLBACK_RESULT_LIMIT = 80;

type SearchRequest = {
  query?: unknown;
  radiusKm?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

type ElementSelector = "nwr" | "node";

type SearchProfile = {
  pattern: RegExp;
  clause: (selector: ElementSelector, around: string) => string;
};

function clause(selector: ElementSelector, around: string, filters: string) {
  return `${selector}(${around})${filters};`;
}

const searchProfiles: SearchProfile[] = [
  {
    pattern: /(ラーメン|らーめん|中華そば|ramen)/i,
    clause: (selector, around) =>
      clause(selector, around, '[amenity~"^(restaurant|fast_food)$"][cuisine~"(ramen|noodle|noodles)",i]'),
  },
  {
    pattern: /(焼肉|やきにく|yakiniku|bbq|barbecue)/i,
    clause: (selector, around) =>
      clause(selector, around, '[amenity="restaurant"][cuisine~"(yakiniku|bbq|barbecue|korean)",i]'),
  },
  {
    pattern: /(スパイスカレー|スパイス|カレー|curry)/i,
    clause: (selector, around) =>
      clause(selector, around, '[amenity~"^(restaurant|fast_food)$"][cuisine~"(curry|indian|nepalese|sri_lankan)",i]'),
  },
  {
    pattern: /(寿司|鮨|すし|sushi)/i,
    clause: (selector, around) =>
      clause(selector, around, '[amenity~"^(restaurant|fast_food)$"][cuisine~"sushi",i]'),
  },
  {
    pattern: /(カフェ|コーヒー|珈琲|cafe|coffee)/i,
    clause: (selector, around) =>
      clause(selector, around, '[amenity="restaurant"][cuisine~"(coffee|coffee_shop|cafe)",i]'),
  },
  {
    pattern: /(弁当|お弁当|惣菜|デリ|テイクアウト|持ち帰り|bento|deli)/i,
    clause: (selector, around) =>
      clause(selector, around, '[amenity~"^(restaurant|fast_food)$"][cuisine~"(bento|deli|takeaway)",i]'),
  },
  {
    pattern: /(パン|ベーカリー|bakery|bread)/i,
    clause: (selector, around) => clause(selector, around, '[shop="bakery"]'),
  },
];

function coreClauses(selector: ElementSelector, around: string) {
  return [
    clause(selector, around, '[amenity~"^(restaurant|cafe|fast_food)$"]'),
    clause(selector, around, '[shop~"^(coffee|bakery|deli)$"]'),
  ];
}

function overpassRegexKeyword(searchQuery: string) {
  const keyword = searchQuery.trim().slice(0, 24);
  if (keyword.length < 2) return "";
  return keyword.replace(/[\\^$.*+?()[\]{}|"']/g, "\\$&");
}

function clausesForQuery(searchQuery: string, selector: ElementSelector, around: string) {
  const profile = searchProfiles.find((candidate) => candidate.pattern.test(searchQuery));
  const keyword = overpassRegexKeyword(searchQuery);
  const clauses = coreClauses(selector, around);

  if (keyword) {
    clauses.unshift(
      clause(selector, around, `[amenity~"^(restaurant|cafe|fast_food)$"][name~"${keyword}",i]`),
      clause(selector, around, `[shop~"^(coffee|bakery|deli)$"][name~"${keyword}",i]`),
    );
  }
  if (profile) clauses.push(profile.clause(selector, around));

  return clauses.slice(0, 5);
}

function overpassQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  searchQuery: string,
  fallback = false,
) {
  const around = `around:${radiusMeters},${latitude},${longitude}`;
  const selector = fallback ? "node" : "nwr";
  const limit = fallback ? FALLBACK_RESULT_LIMIT : PRIMARY_RESULT_LIMIT;
  const clauses = clausesForQuery(searchQuery, selector, around).join("\n      ");

  return `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];
    (
      ${clauses}
    );
    out center tags ${limit};`;
}

async function fetchOverpass(query: string) {
  let lastError: unknown;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
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

      if (!response.ok) {
        lastError = new Error(`Overpass API returned ${response.status}`);
        continue;
      }

      return (await response.json()) as OverpassResponse;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Overpass API request failed");
}

async function searchOverpass(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  searchQuery: string,
) {
  try {
    return await fetchOverpass(overpassQuery(latitude, longitude, radiusMeters, searchQuery));
  } catch (primaryError) {
    console.warn("Primary Overpass request failed; trying fallback", primaryError);
    return fetchOverpass(overpassQuery(latitude, longitude, radiusMeters, searchQuery, true));
  }
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

  try {
    const data = await searchOverpass(latitude, longitude, radiusKm * 1000, query);
    const restaurants = normalizeOsmRestaurants(
      data.elements ?? [],
      { latitude, longitude },
      query,
    ).filter((restaurant) => restaurant.distanceKm <= radiusKm);

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error("Overpass request failed after fallback", error);
    return NextResponse.json(
      { error: "検索が混み合っています。条件を変えてもう一度お試しください" },
      { status: 502 },
    );
  }
}
