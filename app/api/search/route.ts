import { NextResponse } from "next/server";
import { normalizeOsmRestaurants, OverpassResponse } from "@/lib/places";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const AMENITIES = "restaurant|cafe|fast_food|bar|pub|food_court";

type AdditionalSearchRule = {
  pattern: RegExp;
  clauses: (around: string) => string[];
};

const additionalSearchRules: AdditionalSearchRule[] = [
  {
    pattern: /(弁当|弁当屋|お弁当)/,
    clauses: (around) => [
      `nwr(${around})[shop~"^(deli|convenience)$"];`,
      `nwr(${around})[amenity="fast_food"];`,
      `nwr(${around})[cuisine~"(bento|lunch|takeaway|meal_takeaway|deli|fast_food)",i];`,
      `nwr(${around})[name~"(弁当|お弁当|bento|lunch|deli|takeaway)",i];`,
      `nwr(${around})[takeaway~"^(yes|only)$"];`,
    ],
  },
  {
    pattern: /(惣菜|デリ)/,
    clauses: (around) => [
      `nwr(${around})[shop~"^(deli|delicatessen|prepared_food)$"];`,
      `nwr(${around})[cuisine~"(deli|takeaway|prepared_food|delicatessen)",i];`,
      `nwr(${around})[name~"(惣菜|デリ|deli|delicatessen|prepared_food)",i];`,
      `nwr(${around})[takeaway~"^(yes|only)$"];`,
    ],
  },
  {
    pattern: /(テイクアウト|持ち帰り)/,
    clauses: (around) => [
      `nwr(${around})[shop="deli"];`,
      `nwr(${around})[amenity="fast_food"];`,
      `nwr(${around})[cuisine~"(takeaway|fast_food|bento|deli|meal_takeaway)",i];`,
      `nwr(${around})[takeaway~"^(yes|only)$"];`,
    ],
  },
  {
    pattern: /(スパイス|スパイスカレー)/,
    clauses: (around) => [
      `nwr(${around})[cuisine~"(spice|spices|curry|indian|sri_lankan|nepalese|thai)",i];`,
      `nwr(${around})[name~"(スパイス|spice|curry|indian|sri.?lankan|nepalese|thai)",i];`,
    ],
  },
  {
    pattern: /(コーヒー|珈琲)/,
    clauses: (around) => [
      `nwr(${around})[amenity="cafe"];`,
      `nwr(${around})[shop="coffee"];`,
      `nwr(${around})[cuisine~"(coffee|cafe|coffee_shop)",i];`,
      `nwr(${around})[name~"(コーヒー|珈琲|coffee|cafe)",i];`,
    ],
  },
  {
    pattern: /(パン|ベーカリー)/,
    clauses: (around) => [
      `nwr(${around})[shop="bakery"];`,
      `nwr(${around})[cuisine~"(bakery|bread)",i];`,
      `nwr(${around})[name~"(パン|ベーカリー|bakery|bread)",i];`,
    ],
  },
];

type SearchRequest = {
  query?: unknown;
  radiusKm?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

function overpassQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  searchQuery: string,
) {
  const around = `around:${radiusMeters},${latitude},${longitude}`;
  const additionalQueries = additionalSearchRules
    .filter((rule) => rule.pattern.test(searchQuery))
    .flatMap((rule) => rule.clauses(around))
    .join("\n      ");

  return `[out:json][timeout:25];
    (
      nwr(around:${radiusMeters},${latitude},${longitude})[amenity~"^(${AMENITIES})$"];
      ${additionalQueries}
    );
    out center tags;`;
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
        signal: AbortSignal.timeout(30000),
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
    const data = await fetchOverpass(
      overpassQuery(latitude, longitude, radiusKm * 1000, query),
    );
    const restaurants = normalizeOsmRestaurants(
      data.elements ?? [],
      { latitude, longitude },
      query,
    ).filter((restaurant) => restaurant.distanceKm <= radiusKm);

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error("Overpass request failed", error);
    return NextResponse.json(
      { error: "お店情報を取得できませんでした。少し待ってから、もう一度お試しください。" },
      { status: 502 },
    );
  }
}
