export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Restaurant = {
  id: string;
  name: string;
  genre: string;
  cuisine: string;
  amenity: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  osmUri: string;
};

export type OsmTags = Record<string, string | undefined>;

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: OsmTags;
};

export type OverpassResponse = {
  elements?: OverpassElement[];
};

const amenityLabels: Record<string, string> = {
  restaurant: "レストラン",
  cafe: "カフェ",
  fast_food: "ファストフード",
  bar: "バー",
  pub: "居酒屋・パブ",
  food_court: "フードコート",
};

const cuisineLabels: Record<string, string> = {
  japanese: "和食",
  sushi: "寿司",
  ramen: "ラーメン",
  noodle: "麺料理",
  soba: "そば",
  udon: "うどん",
  yakiniku: "焼肉",
  bbq: "焼肉",
  barbecue: "焼肉・BBQ",
  chinese: "中華",
  italian: "イタリアン",
  french: "フレンチ",
  indian: "インド料理",
  curry: "カレー",
  thai: "タイ料理",
  korean: "韓国料理",
  burger: "ハンバーガー",
  pizza: "ピザ",
  seafood: "魚介料理",
  coffee_shop: "コーヒー",
  dessert: "スイーツ",
  ice_cream: "アイスクリーム",
  cafe: "カフェ",
};

const queryAliases: Record<string, string[]> = {
  和食: ["japanese", "washoku"],
  寿司: ["sushi", "鮨", "すし"],
  ラーメン: ["ramen", "noodle", "中華そば"],
  そば: ["soba", "蕎麦", "noodle"],
  うどん: ["udon", "noodle"],
  焼肉: ["yakiniku", "barbecue", "bbq", "korean"],
  中華: ["chinese", "china", "中国料理"],
  麻婆豆腐: ["chinese", "sichuan", "四川", "麻婆"],
  イタリアン: ["italian", "italy", "pasta", "pizza"],
  パスタ: ["pasta", "italian"],
  ピザ: ["pizza", "italian"],
  フレンチ: ["french", "france"],
  カレー: ["curry", "indian", "カリー"],
  タイ料理: ["thai", "thailand"],
  韓国料理: ["korean", "korea"],
  ハンバーガー: ["burger", "hamburger", "fast_food"],
  魚: ["seafood", "fish", "魚介", "海鮮"],
  海鮮: ["seafood", "fish", "魚介"],
  牡蠣: ["oyster", "seafood", "魚介"],
  鰻: ["unagi", "eel", "うなぎ"],
  居酒屋: ["izakaya", "pub", "bar"],
  カフェ: ["cafe", "coffee_shop", "coffee"],
  スイーツ: ["dessert", "cake", "ice_cream", "cafe", "pastry"],
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceInKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(value: string) {
  return value.toLocaleLowerCase("ja").replace(/[\s　・･_-]/g, "");
}

function queryTerms(query: string) {
  const normalizedQuery = normalize(query);
  const aliases = Object.entries(queryAliases).flatMap(([label, terms]) =>
    normalizedQuery.includes(normalize(label)) ? terms : [],
  );

  return [...new Set([query, ...aliases].map(normalize).filter(Boolean))];
}

function matchesQuery(tags: OsmTags, query: string) {
  if (!query.trim()) return true;

  const searchable = normalize(
    [tags.name, tags["name:ja"], tags.cuisine, tags.amenity, tags.description]
      .filter(Boolean)
      .join(" "),
  );

  return queryTerms(query).some((term) => searchable.includes(term));
}

function addressFromTags(tags: OsmTags) {
  const fullAddress = nonEmptyTag(tags["addr:full"]);
  if (fullAddress) return fullAddress;

  const streetAddress = [
    nonEmptyTag(tags["addr:housenumber"]),
    nonEmptyTag(tags["addr:street"]),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    streetAddress ||
    nonEmptyTag(tags["addr:city"]) ||
    nonEmptyTag(tags["addr:province"]) ||
    "住所情報なし"
  );
}

function cuisineLabel(cuisine = "") {
  const values = cuisine
    .split(/[;,]/)
    .map((value) => value.trim().toLocaleLowerCase("ja"))
    .filter(Boolean);

  return values
    .map((value) => cuisineLabels[value] ?? value.replaceAll("_", " "))
    .join("・");
}

function nonEmptyTag(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue || undefined;
}

function restaurantName(tags: OsmTags, amenity: string, cuisine: string) {
  return (
    nonEmptyTag(tags.name) ??
    nonEmptyTag(tags["name:ja"]) ??
    nonEmptyTag(tags.brand) ??
    nonEmptyTag(tags.operator) ??
    nonEmptyTag(tags.official_name) ??
    nonEmptyTag(tags["addr:housename"]) ??
    nonEmptyTag(cuisine) ??
    amenityLabels[amenity] ??
    "店舗名不明"
  );
}

export function normalizeOsmRestaurants(
  elements: OverpassElement[],
  origin: Coordinates,
  query: string,
): Restaurant[] {
  const seen = new Set<string>();

  return elements
    .flatMap((element) => {
      const tags = element.tags ?? {};
      const latitude = element.lat ?? element.center?.lat;
      const longitude = element.lon ?? element.center?.lon;
      if (latitude === undefined || longitude === undefined || !matchesQuery(tags, query)) return [];

      const id = `${element.type}/${element.id}`;
      if (seen.has(id)) return [];
      seen.add(id);

      const amenity = tags.amenity ?? "";
      const cuisine = cuisineLabel(tags.cuisine);

      return [{
        id,
        name: restaurantName(tags, amenity, cuisine),
        genre: cuisine || amenityLabels[amenity] || "飲食店",
        cuisine,
        amenity,
        formattedAddress: addressFromTags(tags),
        latitude,
        longitude,
        distanceKm: distanceInKm(origin, { latitude, longitude }),
        osmUri: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      }];
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 50);
}
