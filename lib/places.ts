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
  meal_takeaway: "テイクアウト",
};

const shopLabels: Record<string, string> = {
  deli: "惣菜",
  delicatessen: "惣菜",
  prepared_food: "惣菜",
  convenience: "コンビニ",
  coffee: "カフェ・コーヒー",
  bakery: "パン",
};

const cuisineLabels: Record<string, string> = {
  japanese: "和食",
  sushi: "寿司",
  ramen: "ラーメン",
  noodle: "麺料理",
  noodles: "麺料理",
  soba: "そば",
  udon: "うどん",
  yakiniku: "焼肉",
  bbq: "焼肉",
  barbecue: "焼肉・BBQ",
  chinese: "中華",
  italian: "イタリアン",
  french: "フレンチ",
  indian: "スパイス・カレー",
  curry: "スパイス・カレー",
  spice: "スパイス・カレー",
  spices: "スパイス・カレー",
  sri_lankan: "スパイス・カレー",
  nepalese: "スパイス・カレー",
  thai: "タイ料理",
  korean: "韓国料理",
  burger: "ハンバーガー",
  pizza: "ピザ",
  seafood: "魚介料理",
  coffee: "カフェ・コーヒー",
  coffee_shop: "カフェ・コーヒー",
  dessert: "スイーツ",
  ice_cream: "アイスクリーム",
  cafe: "カフェ・コーヒー",
  bento: "弁当",
  takeaway: "テイクアウト",
  deli: "惣菜",
  meal_takeaway: "テイクアウト",
  lunch: "ランチ",
  prepared_food: "惣菜",
  delicatessen: "惣菜",
  bakery: "パン",
  bread: "パン",
  yakitori: "焼鳥",
  izakaya: "居酒屋",
  teishoku: "定食",
  diner: "定食",
  chicken: "鶏料理",
  kimchi: "韓国料理",
  gyoza: "中華",
  pasta: "イタリアン",
};

const queryAliases: Record<string, string[]> = {
  和食: ["japanese", "washoku"],
  寿司: ["sushi", "鮨", "すし"],
  ラーメン: ["ramen", "noodles", "noodle", "中華そば"],
  そば: ["soba", "蕎麦", "noodles", "noodle"],
  うどん: ["udon", "noodles", "noodle"],
  焼肉: ["yakiniku", "barbecue", "bbq", "korean"],
  中華: ["chinese", "gyoza", "ramen", "china", "中国料理"],
  麻婆豆腐: ["chinese", "sichuan", "四川", "麻婆"],
  イタリアン: ["italian", "italy", "pasta", "pizza"],
  パスタ: ["pasta", "italian"],
  ピザ: ["pizza", "italian"],
  フレンチ: ["french", "france"],
  カレー: ["curry", "indian", "カリー"],
  タイ料理: ["thai", "thailand"],
  韓国料理: ["korean", "bbq", "kimchi", "korea"],
  ハンバーガー: ["burger", "hamburger", "fast_food"],
  魚: ["seafood", "fish", "魚介", "海鮮"],
  海鮮: ["seafood", "fish", "魚介"],
  牡蠣: ["oyster", "seafood", "魚介"],
  鰻: ["unagi", "eel", "うなぎ"],
  居酒屋: ["izakaya", "pub", "bar", "japanese"],
  カフェ: ["cafe", "coffee_shop", "coffee"],
  コーヒー: ["coffee", "cafe", "coffee_shop"],
  珈琲: ["coffee", "cafe", "coffee_shop"],
  スイーツ: ["dessert", "cake", "ice_cream", "cafe", "pastry"],
  弁当: ["bento", "takeaway", "fast_food", "deli", "meal_takeaway", "lunch"],
  弁当屋: ["bento", "takeaway", "fast_food", "deli", "meal_takeaway", "lunch"],
  お弁当: ["bento", "takeaway", "fast_food", "deli", "meal_takeaway", "lunch"],
  惣菜: ["deli", "takeaway", "prepared_food", "delicatessen"],
  デリ: ["deli", "takeaway", "prepared_food", "delicatessen"],
  テイクアウト: ["takeaway", "fast_food", "bento", "deli", "meal_takeaway"],
  持ち帰り: ["takeaway", "fast_food", "bento", "deli", "meal_takeaway"],
  スパイス: ["spice", "spices", "curry", "indian", "sri_lankan", "nepalese", "thai"],
  スパイスカレー: ["spice", "spices", "curry", "indian", "sri_lankan", "nepalese", "thai"],
  パン: ["bakery", "bread"],
  ベーカリー: ["bakery", "bread"],
  定食: ["japanese", "teishoku", "restaurant", "diner"],
  焼鳥: ["yakitori", "chicken", "izakaya", "japanese"],
  やきとり: ["yakitori", "chicken", "izakaya", "japanese"],
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

  return [...new Set([query, ...aliases].map(normalize).filter(Boolean))].slice(0, 6);
}

function matchesQuery(tags: OsmTags, query: string) {
  if (!query.trim()) return true;

  const takeawayTerms = tags.takeaway === "yes" || tags.takeaway === "only"
    ? "takeaway meal_takeaway テイクアウト"
    : "";
  const searchable = normalize(
    [
      tags.name,
      tags["name:ja"],
      tags.brand,
      tags.operator,
      tags.official_name,
      tags.cuisine,
      tags.amenity,
      tags.shop,
      tags.takeaway,
      tags.description,
      takeawayTerms,
    ]
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

function restaurantName(tags: OsmTags, amenity: string, cuisine: string, shop: string) {
  return (
    nonEmptyTag(tags.name) ??
    nonEmptyTag(tags["name:ja"]) ??
    nonEmptyTag(tags.brand) ??
    nonEmptyTag(tags.operator) ??
    nonEmptyTag(tags.official_name) ??
    nonEmptyTag(tags["addr:housename"]) ??
    nonEmptyTag(cuisine) ??
    amenityLabels[amenity] ??
    shopLabels[shop] ??
    "店舗名不明"
  );
}

function genreLabel(tags: OsmTags, amenity: string, cuisine: string, shop: string) {
  if (cuisine) return cuisine;
  if (shopLabels[shop]) return shopLabels[shop];
  if (tags.takeaway === "yes" || tags.takeaway === "only") return "テイクアウト";
  return amenityLabels[amenity] || "飲食店";
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
      const shop = tags.shop ?? "";
      const cuisine = cuisineLabel(tags.cuisine);

      return [{
        id,
        name: restaurantName(tags, amenity, cuisine, shop),
        genre: genreLabel(tags, amenity, cuisine, shop),
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
