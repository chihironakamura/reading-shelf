import { NextResponse } from "next/server";
import { normalizeOsmRestaurants, OverpassResponse } from "@/lib/places";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const AMENITIES = "restaurant|cafe|fast_food|bar|pub|food_court";

type SearchRequest = {
  query?: unknown;
  radiusKm?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

function overpassQuery(latitude: number, longitude: number, radiusMeters: number) {
  return `[out:json][timeout:25];
    nwr(around:${radiusMeters},${latitude},${longitude})[amenity~"^(${AMENITIES})$"];
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
    const data = await fetchOverpass(overpassQuery(latitude, longitude, radiusKm * 1000));
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
