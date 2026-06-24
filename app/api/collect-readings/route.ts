import { NextResponse } from "next/server";

type Genre = "小説" | "エッセイ" | "旅" | "ホラー" | "仕事" | "沖縄" | "舞台" | "長文考察";
type PriceType = "無料" | "有料";

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

const NAROU_API_URL = "https://api.syosetu.com/novelapi/api/";
const REQUEST_TIMEOUT_MS = 8_000;

function stripText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function toExcerpt(value: string) {
  const text = stripText(value);
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
}

function classifyGenre(novel: NarouNovel): Genre {
  const text = `${novel.title ?? ""} ${novel.story ?? ""} ${novel.keyword ?? ""}`;

  if (/沖縄|那覇|琉球|島/.test(text)) return "沖縄";
  if (/怪談|怖い|恐怖|ホラー|幽霊|怪異/.test(text) || novel.genre === 305) return "ホラー";
  if (/旅|旅行|海|島|電車|列車/.test(text)) return "旅";
  if (/仕事|会社|働く|職場|会議/.test(text)) return "仕事";
  if (/舞台|劇場|演劇|俳優|役者/.test(text)) return "舞台";
  if (/考察|論考|社会|文化|批評|評論/.test(text)) return "長文考察";
  if (novel.genre === 9903) return "エッセイ";

  return "小説";
}

function toReadingItem(novel: NarouNovel): ReadingItem | null {
  if (!novel.title || !novel.ncode) {
    return null;
  }

  const ncode = novel.ncode.toLowerCase();
  const sourceUrl = `https://ncode.syosetu.com/${ncode}/`;
  const description = stripText(novel.story ?? "小説家になろうで公開されている読み物です。");
  const readingMinutes = Math.max(1, Math.round(Number(novel.time) || Math.ceil((Number(novel.length) || 5000) / 500) || 10));

  return {
    id: `narou-${ncode}`,
    title: stripText(novel.title),
    author: stripText(novel.writer ?? "作者不明"),
    genre: classifyGenre(novel),
    priceType: "無料" satisfies PriceType,
    description: description || "小説家になろうで公開されている読み物です。",
    excerpt: toExcerpt(description || novel.title),
    readingMinutes,
    sourceName: "小説家になろう",
    sourceUrl,
  };
}

export async function GET() {
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

  try {
    const response = await fetch(`${NAROU_API_URL}?${params.toString()}`, {
      headers: {
        "User-Agent": "Yomutana/1.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `小説家になろうAPIから取得できませんでした。(${response.status})` }, { status: 502 });
    }

    const data = (await response.json()) as Array<NarouNovel | { allcount: number }>;
    const readings = data
      .filter((entry): entry is NarouNovel => "ncode" in entry)
      .map(toReadingItem)
      .filter((item): item is ReadingItem => item !== null);

    return NextResponse.json({ items: readings, source: "小説家になろう" });
  } catch (error) {
    console.error("Collect readings failed", error);
    return NextResponse.json({ error: "読み物候補の取得に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}
