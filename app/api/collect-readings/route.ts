import { NextRequest, NextResponse } from "next/server";

type Genre = "小説" | "エッセイ" | "旅" | "ホラー" | "仕事" | "沖縄" | "舞台" | "長文考察";
type PriceType = "無料" | "有料";
type SourceType = "aozora" | "narou" | "note" | "kakuyomu" | "blog" | "manual";
type CollectSource = "all" | Exclude<SourceType, "manual">;

type ReadingItem = {
  id: string;
  title: string;
  author: string;
  genre: Genre;
  priceType: PriceType;
  description: string;
  excerpt: string;
  readingMinutes: number;
  sourceName: string;
  sourceType: SourceType;
  sourceUrl: string;
};

type NarouNovel = {
  title?: string;
  ncode?: string;
  writer?: string;
  story?: string;
  biggenre?: number;
  genre?: number;
  keyword?: string;
  length?: number;
  time?: number;
};

type RssFeedConfig = {
  url: string;
  sourceName: string;
  sourceType: Extract<SourceType, "note" | "kakuyomu" | "blog">;
  defaultAuthor?: string;
  trustedFree?: boolean;
};

type RssEntry = {
  title: string;
  link: string;
  description: string;
  author: string;
  sourceName: string;
  sourceType: Extract<SourceType, "note" | "kakuyomu" | "blog">;
  trustedFree: boolean;
};

const NAROU_API_URL = "https://api.syosetu.com/novelapi/api/";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_ITEMS = 50;

const noteRssFeeds: RssFeedConfig[] = [
  { url: "https://note.com/info/rss", sourceName: "note", sourceType: "note", defaultAuthor: "note", trustedFree: true },
];

const kakuyomuRssFeeds: RssFeedConfig[] = [];

const blogRssFeeds: RssFeedConfig[] = [
  { url: "https://staff.hatenablog.com/rss", sourceName: "はてなブログ開発ブログ", sourceType: "blog", defaultAuthor: "はてなブログ", trustedFree: true },
];

const aozoraSeeds: Array<{
  title: string;
  author: string;
  description: string;
  excerpt: string;
  readingMinutes: number;
  genre: Genre;
  sourceUrl: string;
}> = [
  {
    title: "羅生門",
    author: "芥川 竜之介",
    description: "荒れ果てた羅生門を舞台に、人が生き延びるための一線を描く短編小説。",
    excerpt: "下人は、大きな門の下で雨やみを待っていた。",
    readingMinutes: 18,
    genre: "小説",
    sourceUrl: "https://www.aozora.gr.jp/cards/000879/card127.html",
  },
  {
    title: "走れメロス",
    author: "太宰 治",
    description: "約束と信頼をめぐり、友の命を背負って走る男を描いた短編小説。",
    excerpt: "メロスは激怒した。必ず、かの邪智暴虐の王を除かなければならぬと決意した。",
    readingMinutes: 12,
    genre: "小説",
    sourceUrl: "https://www.aozora.gr.jp/cards/000035/card1567.html",
  },
  {
    title: "山月記",
    author: "中島 敦",
    description: "才能と自意識の狭間で虎となった男を通して、人の弱さを見つめる短編小説。",
    excerpt: "隴西の李徴は博学才穎、天宝の末年、若くして名を虎榜に連ねた。",
    readingMinutes: 16,
    genre: "小説",
    sourceUrl: "https://www.aozora.gr.jp/cards/000119/card624.html",
  },
  {
    title: "注文の多い料理店",
    author: "宮沢 賢治",
    description: "山奥の料理店に迷い込んだ二人の紳士を、不思議で不穏な案内が待ち受ける童話。",
    excerpt: "二人の若い紳士が、すっかりイギリスの兵隊のかたちをして、ぴかぴかする鉄砲をかついでいました。",
    readingMinutes: 14,
    genre: "ホラー",
    sourceUrl: "https://www.aozora.gr.jp/cards/000081/card43754.html",
  },
];

function stripText(value: string) {
  return decodeHtml(value)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function truncateText(value: string, maxLength: number) {
  const text = stripText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function isValidSourceUrl(sourceUrl: string) {
  const trimmedUrl = sourceUrl.trim();

  if (!trimmedUrl) {
    return false;
  }

  try {
    const url = new URL(trimmedUrl);
    const hostname = url.hostname.toLowerCase();

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      hostname !== "example.com" &&
      !hostname.endsWith(".example.com") &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "[::1]"
    );
  } catch {
    return false;
  }
}

function createId(sourceType: SourceType, sourceUrl: string) {
  let hash = 0;

  for (const character of sourceUrl) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `${sourceType}-${hash.toString(36)}`;
}

function classifyGenre(text: string, fallback: Genre = "小説"): Genre {
  if (/沖縄|那覇|琉球|島/.test(text)) return "沖縄";
  if (/怪談|怖い|恐怖|ホラー|幽霊|怪異|不穏/.test(text)) return "ホラー";
  if (/旅|旅行|海|電車|列車|街歩き|移動/.test(text)) return "旅";
  if (/仕事|会社|働く|職場|会議|開発|プロダクト/.test(text)) return "仕事";
  if (/舞台|劇場|演劇|俳優|役者|公演/.test(text)) return "舞台";
  if (/考察|論考|社会|文化|批評|評論|分析/.test(text)) return "長文考察";
  if (/随筆|エッセイ|暮らし|日記|生活/.test(text)) return "エッセイ";

  return fallback;
}

function normalizeNarouItem(novel: NarouNovel): ReadingItem | null {
  if (!novel.title || !novel.ncode) {
    return null;
  }

  const ncode = novel.ncode.toLowerCase();
  const sourceUrl = `https://ncode.syosetu.com/${ncode}/`;
  const description = truncateText(novel.story ?? "小説家になろうで公開されている読み物です。", 180);
  const readingMinutes = Math.max(1, Math.round(Number(novel.time) || Math.ceil((Number(novel.length) || 5000) / 600) || 10));
  const title = stripText(novel.title);

  return {
    id: createId("narou", sourceUrl),
    title,
    author: stripText(novel.writer ?? "作者不明"),
    genre: classifyGenre(`${title} ${description} ${novel.keyword ?? ""}`, novel.genre === 9903 ? "エッセイ" : "小説"),
    priceType: "無料",
    description: description || "小説家になろうで公開されている読み物です。",
    excerpt: truncateText(description || title, 72),
    readingMinutes,
    sourceName: "小説家になろう",
    sourceType: "narou",
    sourceUrl,
  };
}

function normalizeRssItem(entry: RssEntry): ReadingItem | null {
  if (!entry.title || !entry.link || !isValidSourceUrl(entry.link)) {
    return null;
  }

  const title = truncateText(entry.title, 80);
  const description = truncateText(entry.description || `${entry.sourceName}で公開されている読み物です。`, 180);
  const sourceName = entry.sourceName || (entry.sourceType === "blog" ? "個人ブログ" : entry.sourceType);

  return {
    id: createId(entry.sourceType, entry.link),
    title,
    author: truncateText(entry.author || sourceName, 60),
    genre: classifyGenre(`${title} ${description}`, entry.sourceType === "blog" || entry.sourceType === "note" ? "エッセイ" : "小説"),
    priceType: entry.trustedFree ? "無料" : "有料",
    description,
    excerpt: truncateText(description || title, 72),
    readingMinutes: estimateReadingMinutes(description),
    sourceName,
    sourceType: entry.sourceType,
    sourceUrl: entry.link,
  };
}

function normalizeAozoraItem(seed: (typeof aozoraSeeds)[number]): ReadingItem {
  return {
    ...seed,
    id: createId("aozora", seed.sourceUrl),
    priceType: "無料",
    sourceName: "青空文庫",
    sourceType: "aozora",
  };
}

function estimateReadingMinutes(text: string) {
  return Math.max(1, Math.min(60, Math.ceil(stripText(text).length / 600) || 3));
}

function dedupeByUrl(items: ReadingItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (!isValidSourceUrl(item.sourceUrl)) {
      return false;
    }

    const key = item.sourceUrl.trim().toLowerCase().replace(/\/$/, "");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function fetchNarouItems() {
  const params = new URLSearchParams({
    out: "json",
    lim: "50",
    order: "hyoka",
    of: "t-n-w-s-bg-g-k-l-ti",
    notr15: "1",
    notbl: "1",
    notgl: "1",
    notzankoku: "1",
  });

  const response = await fetch(`${NAROU_API_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "Yomutana/1.0",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`小説家になろう (${response.status})`);
  }

  const data = (await response.json()) as Array<NarouNovel | { allcount: number }>;

  return data
    .filter((entry): entry is NarouNovel => "ncode" in entry)
    .map(normalizeNarouItem)
    .filter((item): item is ReadingItem => item !== null);
}

async function fetchNoteRssItems() {
  return fetchRssItems(noteRssFeeds);
}

async function fetchKakuyomuItems() {
  return fetchRssItems(kakuyomuRssFeeds);
}

async function fetchBlogRssItems() {
  return fetchRssItems(blogRssFeeds);
}

async function fetchAozoraItems() {
  return aozoraSeeds.map(normalizeAozoraItem);
}

async function fetchRssItems(feeds: RssFeedConfig[]) {
  const entries = await Promise.all(feeds.map(fetchRssFeed));
  return entries
    .flat()
    .map(normalizeRssItem)
    .filter((item): item is ReadingItem => item !== null);
}

async function fetchRssFeed(feed: RssFeedConfig) {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "Yomutana/1.0",
      Accept: "application/rss+xml, application/atom+xml, text/xml",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`${feed.sourceName} (${response.status})`);
  }

  const xml = await response.text();
  const items = extractXmlBlocks(xml, "item");
  const entries = items.length > 0 ? items : extractXmlBlocks(xml, "entry");

  return entries.slice(0, 20).map((entry) => {
    const title = extractXmlValue(entry, "title");
    const link = extractRssLink(entry);
    const description =
      extractXmlValue(entry, "description") || extractXmlValue(entry, "summary") || extractXmlValue(entry, "content:encoded") || title;
    const author =
      extractXmlValue(entry, "dc:creator") || extractXmlValue(entry, "author") || extractXmlValue(entry, "name") || feed.defaultAuthor || feed.sourceName;

    return {
      title,
      link,
      description,
      author,
      sourceName: feed.sourceName,
      sourceType: feed.sourceType,
      trustedFree: feed.trustedFree === true,
    };
  });
}

function extractXmlBlocks(xml: string, tagName: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi"))).map((match) => match[1] ?? "");
}

function extractXmlValue(xml: string, tagName: string) {
  const escapedTagName = tagName.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escapedTagName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`, "i"));
  return stripText(match?.[1] ?? "");
}

function extractRssLink(xml: string) {
  const value = extractXmlValue(xml, "link");

  if (value) {
    return value;
  }

  const hrefMatch = xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i);
  return stripText(hrefMatch?.[1] ?? "");
}

function sourceLabel(source: CollectSource) {
  const labels: Record<CollectSource, string> = {
    all: "すべて",
    narou: "小説家になろう",
    note: "note",
    kakuyomu: "カクヨム",
    blog: "個人ブログ",
    aozora: "青空文庫",
  };

  return labels[source];
}

export async function GET(request: NextRequest) {
  const requestedSource = request.nextUrl.searchParams.get("source") ?? "all";
  const selectedSource: CollectSource =
    requestedSource === "narou" ||
    requestedSource === "note" ||
    requestedSource === "kakuyomu" ||
    requestedSource === "blog" ||
    requestedSource === "aozora"
      ? requestedSource
      : "all";
  const collectors: Array<{ source: CollectSource; label: string; fetchItems: () => Promise<ReadingItem[]> }> = [
    { source: "narou", label: "小説家になろう", fetchItems: fetchNarouItems },
    { source: "note", label: "note", fetchItems: fetchNoteRssItems },
    { source: "kakuyomu", label: "カクヨム", fetchItems: fetchKakuyomuItems },
    { source: "blog", label: "個人ブログ", fetchItems: fetchBlogRssItems },
    { source: "aozora", label: "青空文庫", fetchItems: fetchAozoraItems },
  ];
  const activeCollectors = selectedSource === "all" ? collectors : collectors.filter((collector) => collector.source === selectedSource);
  const failedSources: string[] = [];
  const collected: ReadingItem[] = [];

  await Promise.all(
    activeCollectors.map(async (collector) => {
      try {
        collected.push(...(await collector.fetchItems()));
      } catch (error) {
        console.error(`${collector.label} collection failed`, error);
        failedSources.push(collector.label);
      }
    }),
  );

  const items = dedupeByUrl(collected).slice(0, MAX_ITEMS);
  const message =
    items.length === 0
      ? "取得できる読み物がありませんでした"
      : failedSources.length > 0
        ? `${sourceLabel(selectedSource)}から${items.length}件取得しました。一部取得に失敗: ${failedSources.join("、")}`
        : `${sourceLabel(selectedSource)}から${items.length}件取得しました。`;

  return NextResponse.json({ items, failedSources, message });
}
