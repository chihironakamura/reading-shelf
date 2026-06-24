"use client";

import {
  Bookmark,
  BookOpen,
  Clock3,
  Edit3,
  ExternalLink,
  Heart,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Waves,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

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

type ReadingForm = Omit<ReadingItem, "id">;
type TimeBucket = "5分以内" | "6〜15分" | "16〜30分" | "31分以上";
type MoodId = "calm" | "coffee" | "travel" | "okinawa" | "work" | "night" | "think" | "refresh";

type Recommendation = {
  item: ReadingItem;
  score: number;
  reasons: string[];
};

type CollectStatus = {
  type: "idle" | "loading" | "success" | "error";
  message: string;
};

type CollectReadingsResponse = {
  items?: ReadingItem[];
  error?: string;
};

type TodayShelf = {
  date: string;
  theme: string;
  ids: string[];
  seed: number;
};

type TodayShelfCard = {
  item: ReadingItem;
  reason: string;
};

type MoodOption = {
  id: MoodId;
  label: string;
  comment: string;
  genres: Genre[];
  maxMinutes?: number;
};

const genres: Genre[] = ["小説", "エッセイ", "旅", "ホラー", "仕事", "沖縄", "舞台", "長文考察"];
const priceTypes: PriceType[] = ["無料", "有料"];
const itemsPerPage = 6;
const todayShelfThemes = ["朝のコーヒー", "静かな夜", "沖縄を感じる", "仕事終わり", "旅に出たい", "考えごと", "夏の海", "雨の日"];
const moodOptions: MoodOption[] = [
  { id: "calm", label: "静かに読みたい", comment: "波音みたいに穏やかな文章を多めに選びます。", genres: ["エッセイ", "小説"], maxMinutes: 15 },
  { id: "coffee", label: "カフェ時間", comment: "短めで余韻の残る読み物を優先します。", genres: ["エッセイ", "仕事"], maxMinutes: 10 },
  { id: "travel", label: "旅に出たい", comment: "海や遠くの街を感じる棚に整えます。", genres: ["旅", "沖縄"] },
  { id: "okinawa", label: "沖縄を感じる", comment: "島の空気をまとった文章を引き寄せます。", genres: ["沖縄", "旅"] },
  { id: "work", label: "仕事終わり", comment: "働く気持ちをほどく文章を選びます。", genres: ["仕事", "エッセイ"], maxMinutes: 15 },
  { id: "night", label: "静かな夜", comment: "夜にゆっくり沈める物語を増やします。", genres: ["小説", "ホラー"] },
  { id: "think", label: "考えごと", comment: "少し深く潜れる考察や文化の文章を優先します。", genres: ["長文考察", "エッセイ"] },
  { id: "refresh", label: "気分転換", comment: "いつもと違うジャンルに出会いやすくします。", genres: ["旅", "舞台", "小説"] },
];

const storageKeys = {
  items: "yomutana.items",
  favorites: "yomutana.favorites",
  readLater: "yomutana.readLater",
  readHistory: "yomutana.readHistory",
  recommendationSeed: "yomutana.recommendationSeed",
  selectedMood: "yomutana.selectedMood",
  todayShelf: "todayShelf",
  todayShelfDate: "todayShelfDate",
};

const sampleItems: ReadingItem[] = [
  {
    id: "sample-novel-1",
    title: "夜明け前の栞",
    author: "水城 透",
    genre: "小説",
    priceType: "無料",
    description: "古書店で見つけた一冊をきっかけに、失われた手紙の行方を追う静かな短編小説。",
    excerpt: "雨の匂いが残る朝、栞だけがページの間で昨日の時間を覚えていた。",
    readingMinutes: 18,
    sourceName: "架空文庫",
    sourceUrl: "https://example.com/yomutana/yoake",
  },
  {
    id: "sample-essay-1",
    title: "日曜日の台所から",
    author: "春原 梢",
    genre: "エッセイ",
    priceType: "無料",
    description: "生活の小さな手触りを、料理と記憶からすくい上げる週末エッセイ。",
    excerpt: "煮立つ鍋のそばでは、急がないことだけが正しい手順になる。",
    readingMinutes: 9,
    sourceName: "余白帖",
    sourceUrl: "https://example.com/yomutana/kitchen",
  },
  {
    id: "sample-travel-1",
    title: "各駅停車で海まで",
    author: "青野 灯",
    genre: "旅",
    priceType: "有料",
    description: "予定を詰め込まない一人旅の記録。車窓、駅前食堂、海沿いの宿をめぐる長文投稿。",
    excerpt: "乗り換え案内に出ない時間こそ、旅の輪郭をやわらかくしてくれた。",
    readingMinutes: 24,
    sourceName: "旅読ジャーナル",
    sourceUrl: "https://example.com/yomutana/local-train",
  },
  {
    id: "sample-horror-1",
    title: "三階の空室",
    author: "黒瀬 円",
    genre: "ホラー",
    priceType: "無料",
    description: "古い集合住宅の空き部屋にまつわる、音だけで近づいてくる怪異譚。",
    excerpt: "誰も住んでいないはずの部屋から、毎晩きっちり二十三時に水が流れる。",
    readingMinutes: 14,
    sourceName: "怪談草紙",
    sourceUrl: "https://example.com/yomutana/vacant-room",
  },
  {
    id: "sample-work-1",
    title: "会議のあとに残るもの",
    author: "佐伯 玲",
    genre: "仕事",
    priceType: "有料",
    description: "働く人の疲れと回復、チームで言葉を扱う難しさについて考える仕事エッセイ。",
    excerpt: "議事録に残らない沈黙ほど、次の仕事の温度を決めていることがある。",
    readingMinutes: 12,
    sourceName: "Desk Notes",
    sourceUrl: "https://example.com/yomutana/meeting",
  },
  {
    id: "sample-okinawa-1",
    title: "風の通る市場で",
    author: "仲里 美帆",
    genre: "沖縄",
    priceType: "無料",
    description: "市場の朝、島野菜、家族の記憶をめぐる、沖縄の暮らしに根ざした随筆。",
    excerpt: "島豆腐を包む手つきには、急がない朝のリズムが残っていた。",
    readingMinutes: 11,
    sourceName: "南風ノート",
    sourceUrl: "https://example.com/yomutana/market",
  },
  {
    id: "sample-stage-1",
    title: "幕が下りたあとの廊下",
    author: "藤堂 真",
    genre: "舞台",
    priceType: "有料",
    description: "小劇場の制作現場を描く連載エッセイ。拍手の後に残る仕事と人の気配を追う。",
    excerpt: "舞台袖の暗がりで、誰かの小さな深呼吸だけがまだ物語を続けていた。",
    readingMinutes: 20,
    sourceName: "Theatre Shelf",
    sourceUrl: "https://example.com/yomutana/backstage",
  },
  {
    id: "sample-analysis-1",
    title: "なぜ私たちは長い感想を読むのか",
    author: "森下 葵",
    genre: "長文考察",
    priceType: "無料",
    description: "読書体験、SNS、批評の距離感をめぐる読み応えのある考察記事。",
    excerpt: "感想は結論ではなく、もう一度その作品に戻るための細い通路なのかもしれない。",
    readingMinutes: 28,
    sourceName: "読む研究室",
    sourceUrl: "https://example.com/yomutana/long-review",
  },
];

const emptyForm: ReadingForm = {
  title: "",
  author: "",
  genre: "小説",
  priceType: "無料",
  description: "",
  excerpt: "",
  readingMinutes: 10,
  sourceName: "",
  sourceUrl: "",
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getTimeBucket(minutes: number): TimeBucket {
  if (minutes <= 5) {
    return "5分以内";
  }

  if (minutes <= 15) {
    return "6〜15分";
  }

  if (minutes <= 30) {
    return "16〜30分";
  }

  return "31分以上";
}

function addScore<T extends string>(scores: Partial<Record<T, number>>, key: T, value: number) {
  scores[key] = (scores[key] ?? 0) + value;
}

function getTopKey<T extends string>(scores: Partial<Record<T, number>>): T | null {
  const entries = Object.entries(scores) as [T, number][];
  return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function getTodayDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function seedFromText(value: string) {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function rotateBySeed<T>(items: T[], seed: number) {
  if (items.length === 0) {
    return items;
  }

  const start = seed % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function getMoodOption(moodId: MoodId) {
  return moodOptions.find((mood) => mood.id === moodId) ?? moodOptions[0];
}

function getMoodScore(item: ReadingItem, moodId: MoodId) {
  const mood = getMoodOption(moodId);
  let score = 0;

  if (mood.genres.includes(item.genre)) {
    score += 4;
  }

  if (mood.maxMinutes && item.readingMinutes <= mood.maxMinutes) {
    score += 2;
  }

  return score;
}

function getTodayShelfReason(
  item: ReadingItem,
  favorites: string[],
  readLater: string[],
  readItems: ReadingItem[],
  moodId: MoodId,
) {
  const mood = getMoodOption(moodId);
  const favoriteGenre = readItems.find((readItem) => favorites.includes(readItem.id))?.genre;
  const savedTimeBucket = readItems.find((readItem) => readLater.includes(readItem.id));

  if (mood.genres.includes(item.genre)) {
    return `今日の気分「${mood.label}」に合う一冊です`;
  }

  if (favoriteGenre === item.genre) {
    return `🏝 最近${item.genre}をよく読んでいます`;
  }

  if (savedTimeBucket && getTimeBucket(savedTimeBucket.readingMinutes) === getTimeBucket(item.readingMinutes)) {
    return `☕ ${getTimeBucket(item.readingMinutes)}をよく選んでいます`;
  }

  if (item.genre === "沖縄") {
    return "🌊 沖縄ジャンルがお好きです";
  }

  if (item.genre === "旅") {
    return "🌊 旅に出たくなる文章です";
  }

  if (item.readingMinutes <= 10) {
    return "☕ カフェ時間に読みやすい長さです";
  }

  return `🏝 今日のテーマ「${item.genre}」に合う一冊です`;
}

function createTodayShelf(
  items: ReadingItem[],
  recommendations: Recommendation[],
  readHistory: string[],
  favorites: string[],
  readLater: string[],
  date: string,
  moodId: MoodId,
  seedOffset = 0,
): TodayShelf {
  const seed = seedFromText(`${date}-${moodId}`) + seedOffset;
  const readSet = new Set(readHistory);
  const readItems = items.filter((item) => readSet.has(item.id));
  const readGenres = new Set(readItems.map((item) => item.genre));
  const recommendationScore = new Map(recommendations.map((recommendation) => [recommendation.item.id, recommendation.score]));
  const theme = todayShelfThemes[seed % todayShelfThemes.length];
  const scoredItems = rotateBySeed(
    items
      .filter((item) => !readSet.has(item.id))
      .map((item, index) => {
        const aiScore = recommendationScore.get(item.id) ?? 0;
        const quietGenreBonus = readGenres.has(item.genre) ? 0 : 3;
        const popularBonus = (favorites.includes(item.id) ? 2 : 0) + (readLater.includes(item.id) ? 1 : 0);
        const newItemBonus = Math.max(0, 2 - index * 0.05);
        const moodBonus = getMoodScore(item, moodId);
        const themeBonus =
          (theme.includes("沖縄") && item.genre === "沖縄") ||
          (theme.includes("旅") && item.genre === "旅") ||
          (theme.includes("仕事") && item.genre === "仕事") ||
          (theme.includes("考え") && item.genre === "長文考察")
            ? 2
            : 0;

        return {
          item,
          score: aiScore * 10 + quietGenreBonus + popularBonus + newItemBonus + themeBonus + moodBonus,
        };
      })
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "ja")),
    seed,
  );
  const selected: ReadingItem[] = [];
  const selectedIds = new Set<string>();

  genres.forEach((genre) => {
    if (selected.length >= 6) {
      return;
    }

    const candidate = scoredItems.find(({ item }) => item.genre === genre && !selectedIds.has(item.id));
    if (candidate) {
      selected.push(candidate.item);
      selectedIds.add(candidate.item.id);
    }
  });

  scoredItems.forEach(({ item }) => {
    if (selected.length < 6 && !selectedIds.has(item.id)) {
      selected.push(item);
      selectedIds.add(item.id);
    }
  });

  return {
    date,
    theme,
    ids: selected.map((item) => item.id),
    seed,
  };
}

function rotateRecommendations(recommendations: Recommendation[], seed: number) {
  const pool = recommendations.slice(0, 20);

  if (pool.length <= 5) {
    return pool;
  }

  const start = (seed * 5) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, 5);
}

function buildRecommendations(
  items: ReadingItem[],
  readHistory: string[],
  favorites: string[],
  readLater: string[],
  seed: number,
  moodId: MoodId,
): Recommendation[] {
  const readSet = new Set(readHistory);
  const favoriteSet = new Set(favorites);
  const readLaterSet = new Set(readLater);
  const genreScores: Partial<Record<Genre, number>> = {};
  const priceScores: Partial<Record<PriceType, number>> = {};
  const authorScores: Record<string, number> = {};
  const timeScores: Partial<Record<TimeBucket, number>> = {};
  const favoriteGenres: Partial<Record<Genre, number>> = {};
  const savedTimeBuckets: Partial<Record<TimeBucket, number>> = {};

  items.forEach((item) => {
    const timeBucket = getTimeBucket(item.readingMinutes);
    const readWeight = readSet.has(item.id) ? 3 : 0;
    const favoriteWeight = favoriteSet.has(item.id) ? 5 : 0;
    const readLaterWeight = readLaterSet.has(item.id) ? 2 : 0;
    const totalWeight = readWeight + favoriteWeight + readLaterWeight;

    if (totalWeight === 0) {
      return;
    }

    addScore(genreScores, item.genre, totalWeight);
    addScore(priceScores, item.priceType, totalWeight);
    addScore(authorScores, item.author, totalWeight);
    addScore(timeScores, timeBucket, totalWeight);

    if (favoriteWeight > 0) {
      addScore(favoriteGenres, item.genre, favoriteWeight);
    }

    if (readLaterWeight > 0) {
      addScore(savedTimeBuckets, timeBucket, readLaterWeight);
    }
  });

  const topGenre = getTopKey(genreScores);
  const topPrice = getTopKey(priceScores);
  const topAuthor = getTopKey(authorScores);
  const topTimeBucket = getTopKey(timeScores);
  const topFavoriteGenre = getTopKey(favoriteGenres);
  const topSavedTimeBucket = getTopKey(savedTimeBuckets);

  return items
    .filter((item) => !readSet.has(item.id))
    .map((item, index) => {
      const reasons: string[] = [];
      const timeBucket = getTimeBucket(item.readingMinutes);
      const mood = getMoodOption(moodId);
      let score = 0;

      if (mood.genres.includes(item.genre)) {
        score += 3;
        reasons.push(`今日の気分「${mood.label}」に合うため`);
      }

      if (mood.maxMinutes && item.readingMinutes <= mood.maxMinutes) {
        score += 2;
        reasons.push(`${mood.maxMinutes}分以内の気分に合うため`);
      }

      if ((genreScores[item.genre] ?? 0) > 0) {
        score += 4;
        reasons.push(`${item.genre}ジャンルをよく読んでいるため`);
      }

      if ((authorScores[item.author] ?? 0) > 0) {
        score += 2;
        reasons.push(`${item.author}の作品を選んでいるため`);
      }

      if ((timeScores[timeBucket] ?? 0) > 0) {
        score += 2;
        reasons.push(`${timeBucket}の作品をよく選んでいるため`);
      }

      if ((priceScores[item.priceType] ?? 0) > 0) {
        score += 1;
        reasons.push(`${item.priceType}作品の傾向に合うため`);
      }

      if (topGenre === item.genre && !reasons.some((reason) => reason.includes("ジャンル"))) {
        score += 2;
        reasons.push(`${item.genre}ジャンルの傾向に近いため`);
      }

      if (topAuthor === item.author && !reasons.some((reason) => reason.includes(item.author))) {
        score += 1;
        reasons.push(`${item.author}の作品に近いため`);
      }

      if (topTimeBucket === timeBucket && !reasons.some((reason) => reason.includes(timeBucket))) {
        score += 1;
        reasons.push(`${timeBucket}の読了時間に近いため`);
      }

      if (topPrice === item.priceType && !reasons.some((reason) => reason.includes(item.priceType))) {
        score += 1;
        reasons.push(`${item.priceType}の読み方に合うため`);
      }

      if (topFavoriteGenre === item.genre) {
        reasons.unshift(`${item.genre}をお気に入りに入れているため`);
      }

      if (topSavedTimeBucket === timeBucket) {
        reasons.unshift(`${timeBucket}の作品をよく保存しているため`);
      }

      const relaxedMatch =
        item.genre === topGenre || item.priceType === topPrice || timeBucket === topTimeBucket || item.author === topAuthor;

      if (score === 0 && relaxedMatch) {
        score = 1;
      }

      if (score === 0) {
        score = 0.1;
        reasons.push("まだ読んでいない棚から幅を広げるため");
      }

      const stableVariation = ((index + 1) * (seed + 3)) % 7;

      return {
        item,
        score: score + stableVariation / 100,
        reasons: Array.from(new Set(reasons)).slice(0, 2),
      };
    })
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "ja"));
}

export function ReadingShelf() {
  const [items, setItems] = useState<ReadingItem[]>(sampleItems);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [readLater, setReadLater] = useState<string[]>([]);
  const [readHistory, setReadHistory] = useState<string[]>([]);
  const [recommendationSeed, setRecommendationSeed] = useState(0);
  const [selectedMood, setSelectedMood] = useState<MoodId>("calm");
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<Genre | "すべて">("すべて");
  const [priceFilter, setPriceFilter] = useState<PriceType | "すべて">("すべて");
  const [viewFilter, setViewFilter] = useState<"すべて" | "お気に入り" | "あとで読む">("すべて");
  const [showReadItems, setShowReadItems] = useState(false);
  const [form, setForm] = useState<ReadingForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(itemsPerPage);
  const [collectStatus, setCollectStatus] = useState<CollectStatus>({ type: "idle", message: "" });
  const [todayShelf, setTodayShelf] = useState<TodayShelf | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setItems(readJson(storageKeys.items, sampleItems));
    setFavorites(readJson(storageKeys.favorites, []));
    setReadLater(readJson(storageKeys.readLater, []));
    setReadHistory(readJson(storageKeys.readHistory, []));
    setRecommendationSeed(readJson(storageKeys.recommendationSeed, 0));
    setSelectedMood(readJson(storageKeys.selectedMood, "calm"));
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys
          .filter((key) => key.startsWith("kyou-no-gohan"))
          .forEach((key) => {
            caches.delete(key);
          });
      });
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.items, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.favorites, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.readLater, JSON.stringify(readLater));
  }, [readLater]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.readHistory, JSON.stringify(readHistory));
  }, [readHistory]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.recommendationSeed, JSON.stringify(recommendationSeed));
  }, [recommendationSeed]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.selectedMood, JSON.stringify(selectedMood));
  }, [selectedMood]);

  const listRanking = useMemo(
    () => buildRecommendations(items, readHistory, favorites, readLater, 0, selectedMood),
    [favorites, items, readHistory, readLater, selectedMood],
  );
  const itemScoreMap = useMemo(
    () => new Map(listRanking.map((recommendation, index) => [recommendation.item.id, { score: recommendation.score, index }])),
    [listRanking],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const readSet = new Set(readHistory);

    return items
      .filter((item) => {
        if (readSet.has(item.id) && !showReadItems) {
          return false;
        }

        const matchesQuery =
          normalizedQuery.length === 0 ||
          [item.title, item.author, item.description, item.excerpt, item.sourceName, item.genre]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesGenre = genreFilter === "すべて" || item.genre === genreFilter;
        const matchesPrice = priceFilter === "すべて" || item.priceType === priceFilter;
        const matchesView =
          viewFilter === "すべて" ||
          (viewFilter === "お気に入り" && favorites.includes(item.id)) ||
          (viewFilter === "あとで読む" && readLater.includes(item.id));

        return matchesQuery && matchesGenre && matchesPrice && matchesView;
      })
      .sort((a, b) => {
        const aIsRead = readSet.has(a.id);
        const bIsRead = readSet.has(b.id);

        if (aIsRead !== bIsRead) {
          return aIsRead ? 1 : -1;
        }

        const aScore = itemScoreMap.get(a.id);
        const bScore = itemScoreMap.get(b.id);

        if ((bScore?.score ?? 0) !== (aScore?.score ?? 0)) {
          return (bScore?.score ?? 0) - (aScore?.score ?? 0);
        }

        return (aScore?.index ?? Number.MAX_SAFE_INTEGER) - (bScore?.index ?? Number.MAX_SAFE_INTEGER);
      });
  }, [favorites, genreFilter, itemScoreMap, items, priceFilter, query, readHistory, readLater, showReadItems, viewFilter]);

  const totalMinutes = filteredItems.reduce((sum, item) => sum + item.readingMinutes, 0);
  const unreadItemsCount = useMemo(() => {
    const readSet = new Set(readHistory);
    return items.filter((item) => !readSet.has(item.id)).length;
  }, [items, readHistory]);
  const recommendationCandidates = useMemo(
    () => buildRecommendations(items, readHistory, favorites, readLater, recommendationSeed, selectedMood),
    [favorites, items, readHistory, readLater, recommendationSeed, selectedMood],
  );
  const recommendations = useMemo(
    () => rotateRecommendations(recommendationCandidates, recommendationSeed),
    [recommendationCandidates, recommendationSeed],
  );
  const selectedMoodOption = getMoodOption(selectedMood);
  const todayShelfCards = useMemo<TodayShelfCard[]>(() => {
    if (!todayShelf) {
      return [];
    }

    const itemMap = new Map(items.map((item) => [item.id, item]));
    const readSet = new Set(readHistory);
    const readItems = items.filter((item) => readSet.has(item.id));
    const selectedIds = new Set<string>();
    const cards = todayShelf.ids
      .map((id) => itemMap.get(id))
      .filter((item): item is ReadingItem => item !== undefined && !readSet.has(item.id))
      .map((item) => {
        selectedIds.add(item.id);
        return {
          item,
          reason: getTodayShelfReason(item, favorites, readLater, readItems, selectedMood),
        };
      });

    recommendationCandidates.forEach(({ item }) => {
      if (cards.length < 6 && !selectedIds.has(item.id) && !readSet.has(item.id)) {
        selectedIds.add(item.id);
        cards.push({
          item,
          reason: getTodayShelfReason(item, favorites, readLater, readItems, selectedMood),
        });
      }
    });

    return cards.slice(0, 6);
  }, [favorites, items, readHistory, readLater, recommendationCandidates, selectedMood, todayShelf]);
  const displayedItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const hasMoreItems = filteredItems.length > displayedItems.length;
  const loadMoreItems = useCallback(() => {
    setVisibleCount((current) => Math.min(current + itemsPerPage, filteredItems.length));
  }, [filteredItems.length]);
  const handleLoadMoreClick = useCallback(() => {
    loadMoreItems();
  }, [loadMoreItems]);

  useEffect(() => {
    setVisibleCount(itemsPerPage);
  }, [genreFilter, priceFilter, query, showReadItems, viewFilter]);

  useEffect(() => {
    setVisibleCount((current) => {
      if (filteredItems.length === 0) {
        return itemsPerPage;
      }

      const minimumCount = Math.min(filteredItems.length, itemsPerPage);
      const nextCount = Math.min(Math.max(current, minimumCount), filteredItems.length);
      const hadRemovedVisibleItem = current > filteredItems.length;

      if (hadRemovedVisibleItem && filteredItems.length > displayedItems.length) {
        return Math.min(filteredItems.length, displayedItems.length + 1);
      }

      return nextCount;
    });
  }, [displayedItems.length, filteredItems.length]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && hasMoreItems) {
          loadMoreItems();
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMoreItems, loadMoreItems]);

  useEffect(() => {
    const date = getTodayDateKey();
    const savedDate = window.localStorage.getItem(storageKeys.todayShelfDate);
    const savedShelf = readJson<TodayShelf | null>(storageKeys.todayShelf, null);

    if (savedDate === date && savedShelf) {
      setTodayShelf(savedShelf);
      return;
    }

    const nextShelf = createTodayShelf(items, recommendationCandidates, readHistory, favorites, readLater, date, selectedMood);
    setTodayShelf(nextShelf);
    window.localStorage.setItem(storageKeys.todayShelf, JSON.stringify(nextShelf));
    window.localStorage.setItem(storageKeys.todayShelfDate, date);
  }, [favorites, items, readHistory, readLater, recommendationCandidates, selectedMood]);

  function toggleList(id: string, setter: (value: string[]) => void, current: string[]) {
    setter(current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]);
  }

  function toggleRead(id: string) {
    setReadHistory((current) => (current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id]));
  }

  function resetReadHistory() {
    setReadHistory([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKeys.readHistory);
    }
  }

  function refreshTodayShelf() {
    if (!window.confirm("今日は別の棚を見てみますか？")) {
      return;
    }

    const date = getTodayDateKey();
    const nextShelf = createTodayShelf(
      items,
      recommendationCandidates,
      readHistory,
      favorites,
      readLater,
      date,
      selectedMood,
      Date.now() % 100_000,
    );
    setTodayShelf(nextShelf);
    window.localStorage.setItem(storageKeys.todayShelf, JSON.stringify(nextShelf));
    window.localStorage.setItem(storageKeys.todayShelfDate, date);
  }

  function selectMood(moodId: MoodId) {
    setSelectedMood(moodId);
    window.localStorage.setItem(storageKeys.selectedMood, JSON.stringify(moodId));

    const date = getTodayDateKey();
    const moodRecommendations = buildRecommendations(items, readHistory, favorites, readLater, recommendationSeed, moodId);
    const nextShelf = createTodayShelf(items, moodRecommendations, readHistory, favorites, readLater, date, moodId, Date.now() % 100_000);
    setTodayShelf(nextShelf);
    window.localStorage.setItem(storageKeys.todayShelf, JSON.stringify(nextShelf));
    window.localStorage.setItem(storageKeys.todayShelfDate, date);
    setVisibleCount(itemsPerPage);
  }

  async function collectReadings() {
    setCollectStatus({ type: "loading", message: "読み物を探しています..." });

    try {
      const response = await fetch("/api/collect-readings", { cache: "no-store" });
      const data = (await response.json()) as CollectReadingsResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "読み物候補の取得に失敗しました。");
      }

      const collectedItems = data.items ?? [];
      const existingUrls = new Set(items.map((item) => item.sourceUrl));
      const incomingUrls = new Set<string>();
      const newItems = collectedItems.filter((item) => {
        if (existingUrls.has(item.sourceUrl) || incomingUrls.has(item.sourceUrl)) {
          return false;
        }

        incomingUrls.add(item.sourceUrl);
        return true;
      });
      const duplicateCount = collectedItems.length - newItems.length;

      if (newItems.length > 0) {
        setItems((current) => [...newItems, ...current]);
        setVisibleCount((current) => Math.max(current, Math.min(itemsPerPage, newItems.length)));
      }

      setCollectStatus({
        type: "success",
        message: `${newItems.length}件追加しました。重複のため${duplicateCount}件は追加しませんでした。`,
      });
    } catch (error) {
      setCollectStatus({
        type: "error",
        message: error instanceof Error ? error.message : "読み物候補の取得に失敗しました。",
      });
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanForm: ReadingForm = {
      ...form,
      title: form.title.trim(),
      author: form.author.trim(),
      description: form.description.trim(),
      excerpt: form.excerpt.trim(),
      sourceName: form.sourceName.trim(),
      sourceUrl: form.sourceUrl.trim(),
      readingMinutes: Math.max(1, Math.round(Number(form.readingMinutes) || 1)),
    };

    if (editingId) {
      setItems((current) => current.map((item) => (item.id === editingId ? { ...cleanForm, id: editingId } : item)));
    } else {
      setItems((current) => [{ ...cleanForm, id: crypto.randomUUID() }, ...current]);
    }

    resetForm();
  }

  function editItem(item: ReadingItem) {
    const editableItem = {
      title: item.title,
      author: item.author,
      genre: item.genre,
      priceType: item.priceType,
      description: item.description,
      excerpt: item.excerpt,
      readingMinutes: item.readingMinutes,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
    };
    setForm(editableItem);
    setEditingId(item.id);
    setAdminOpen(true);
  }

  function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setFavorites((current) => current.filter((savedId) => savedId !== id));
    setReadLater((current) => current.filter((savedId) => savedId !== id));
    setReadHistory((current) => current.filter((savedId) => savedId !== id));
    if (editingId === id) {
      resetForm();
    }
  }

  function resetSamples() {
    setItems(sampleItems);
    setFavorites([]);
    setReadLater([]);
    setReadHistory([]);
    setRecommendationSeed(0);
    resetForm();
  }

  return (
    <main className="ocean-shell min-h-dvh text-[#17324D]">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-clouds" aria-hidden />
        <div className="landing-waves" aria-hidden />
        <div className="landing-hero-inner">
          <div className="landing-copy">
            <p className="landing-kicker">🌊 AI Reading Curator</p>
            <h1 id="landing-title">読む棚</h1>
            <p className="landing-lead">今日も、いい文章と出会おう。</p>
            <p className="landing-poem">波のように、<br />新しい物語が流れ着く。</p>
            <div className="landing-description">
              <p>AIが毎日、<br className="sm:hidden" />あなたのための小さな本棚をつくります。</p>
              <p>無料で公開されている読み物を集め、<br className="hidden sm:block" />あなたの好みに合わせて整理・おすすめします。</p>
            </div>
            <div className="landing-actions" aria-label="読む棚を始める">
              <a href="#today-shelf" className="landing-button landing-button-primary">📖 読み始める</a>
              <a href="#ai-recommendations" className="landing-button landing-button-secondary">✨ AIおすすめを見る</a>
            </div>
          </div>

          <div className="landing-features" aria-label="読む棚の特徴">
            <article>
              <span>🌊</span>
              <h2>今日の棚</h2>
              <p>毎日AIが新しい読み物を選びます</p>
            </article>
            <article>
              <span>🤖</span>
              <h2>AIおすすめ</h2>
              <p>読書履歴からあなた専用に提案</p>
            </article>
            <article>
              <span>📚</span>
              <h2>無料・有料を整理</h2>
              <p>読みたい文章だけを集められます</p>
            </article>
          </div>

          <a href="#today-shelf" className="landing-scroll" aria-label="今日の棚へ移動">
            <span>↓</span>
            <span>↓</span>
            <span>↓</span>
          </a>
        </div>
      </section>

      <section className="app-content mx-auto flex w-full max-w-[96rem] flex-col gap-8 px-4 pb-20 pt-5 sm:px-6 lg:px-8">
        <header className="ocean-hero grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.34fr)] lg:items-end">
          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2F9FE8]/20 bg-white/80 px-4 py-2 text-base font-black text-[#0E4A7B] shadow-sm">
                <Waves aria-hidden size={21} />
                読む棚
              </div>
              <nav className="flex max-w-full gap-2 overflow-x-auto rounded-full bg-white/58 p-1 text-sm font-bold text-[#0E4A7B]">
                {(["ホーム", "お気に入り", "あとで読む", "読んだ"] as const).map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (label === "ホーム") {
                        setViewFilter("すべて");
                        setShowReadItems(false);
                      } else if (label === "読んだ") {
                        setViewFilter("すべて");
                        setShowReadItems(true);
                      } else {
                        setViewFilter(label);
                        setShowReadItems(false);
                      }
                    }}
                    className="min-h-9 shrink-0 rounded-full px-3 transition hover:bg-[#DDF3FF]"
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAdminOpen((current) => !current)}
                  className="min-h-9 shrink-0 rounded-full px-3 transition hover:bg-[#DDF3FF]"
                >
                  管理
                </button>
              </nav>
            </div>
            <div className="space-y-3">
              <p className="text-base font-bold text-[#2F9FE8]">今日も、いい文章と出会おう。</p>
              <h1 className="max-w-3xl text-4xl font-black tracking-normal text-[#0E4A7B] sm:text-6xl">
                海辺のカフェで、静かな文章と出会う。
              </h1>
              <p className="max-w-2xl text-base leading-8 text-[#17324D]/78 sm:text-lg">
                小説、エッセイ、旅の記録、長文考察まで。本文全文は保存せず、読みに行くための入口だけを爽やかに並べます。
              </p>
            </div>
          </div>
          <div className="relative z-10 grid gap-3">
            <button
              type="button"
              onClick={collectReadings}
              disabled={collectStatus.type === "loading"}
              className={`collect-card inline-flex min-h-24 flex-col items-start justify-center gap-1 px-5 py-4 text-left font-bold transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-80 ${
                collectStatus.type === "loading" ? "loading" : ""
              }`}
            >
              <span className="relative z-10 inline-flex items-center gap-2 text-lg">
                <Sparkles aria-hidden size={20} />
                おすすめを増やす
              </span>
              <span className="relative z-10 text-sm font-semibold text-white/82">
                {collectStatus.type === "loading" ? "読み物を探しています..." : "AIが新しい読み物を探します"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAdminOpen((current) => !current)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#2F9FE8]/20 bg-white/82 px-4 text-base font-bold text-[#0E4A7B] shadow-sm transition hover:bg-[#DDF3FF]"
            >
              {adminOpen ? <X aria-hidden size={20} /> : <Plus aria-hidden size={20} />}
              管理画面
            </button>
          </div>
        </header>

        <section className="beta-banner" aria-label="公開前Betaのお知らせ">
          <p className="text-sm font-black text-[#0E4A7B] sm:text-base">🌊 Beta</p>
          <p className="text-sm font-semibold leading-6 text-[#17324D]/76 sm:text-base">
            毎日、新しい文章との出会いを育てています。
          </p>
        </section>

        <section key={selectedMood} className="mood-card grid gap-4 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,1fr)] lg:items-center">
          <div className="space-y-2">
            <p className="text-sm font-black text-[#2F9FE8]">今日の気分</p>
            <h2 className="text-2xl font-black text-[#0E4A7B]">{selectedMoodOption.label}</h2>
            <p className="text-sm font-semibold leading-6 text-[#667085]">{selectedMoodOption.comment}</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:justify-end lg:overflow-visible lg:pb-0">
            {moodOptions.map((mood) => (
              <button
                key={mood.id}
                type="button"
                onClick={() => selectMood(mood.id)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition ${
                  selectedMood === mood.id
                    ? "border-[#2F9FE8] bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] text-white shadow-sm"
                    : "border-[#2F9FE8]/20 bg-white/82 text-[#0E4A7B] hover:border-[#2F9FE8] hover:bg-[#DDF3FF]"
                }`}
              >
                {mood.label}
              </button>
            ))}
          </div>
        </section>

        {collectStatus.message && (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm ${
              collectStatus.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-[#2F9FE8]/20 bg-white/82 text-[#0E4A7B]"
            }`}
          >
            {collectStatus.message}
          </p>
        )}

        <section id="today-shelf" className="today-shelf grid scroll-mt-8 gap-6 p-5 sm:p-6 lg:p-7">
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black text-[#0E4A7B] sm:text-4xl">🌊 今日の棚</h2>
                {todayShelf && (
                  <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-[#2F9FE8]">
                    {todayShelf.theme}
                  </span>
                )}
              </div>
              <p className="text-lg font-bold text-[#17324D]">今日の波が運んできた文章</p>
              <p className="text-sm font-semibold text-[#667085]">更新：{todayShelf?.date ?? getTodayDateKey()}</p>
            </div>
            <button
              type="button"
              onClick={refreshTodayShelf}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#2F9FE8]/35 bg-white/82 px-4 text-sm font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8] hover:bg-[#DDF3FF] lg:min-w-36"
            >
              <RefreshCw aria-hidden size={18} />
              棚を更新
            </button>
          </div>

          {todayShelfCards.length > 0 ? (
            <div className="relative z-10 -mx-5 flex gap-6 overflow-x-auto px-5 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 lg:pb-0">
              {todayShelfCards.map(({ item, reason }, index) => (
                <article
                  key={item.id}
                  className="today-shelf-card grid min-w-[18rem] gap-3 rounded-[22px] border border-[#2F9FE8]/16 bg-white/90 p-4 shadow-[0_18px_44px_rgba(14,74,123,0.12)] lg:min-w-0"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-[#DDF3FF] px-3 py-1 text-xs font-bold text-[#0E4A7B]">{item.genre}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F7F1E5] px-2 py-1 text-xs font-bold text-[#17324D]">
                      <Clock3 aria-hidden size={14} />
                      {item.readingMinutes}分
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black leading-snug text-[#0E4A7B]">{item.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#667085]">{item.author}</p>
                  </div>
                  <p className="line-clamp-3 text-sm leading-6 text-[#17324D]/78">{item.description}</p>
                  <p className="rounded-2xl bg-[#EEF9FF] px-3 py-2 text-xs font-bold text-[#0E4A7B]">{reason}</p>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] px-3 text-sm font-bold text-white transition hover:brightness-105"
                  >
                    <ExternalLink aria-hidden size={17} />
                    読みに行く
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="relative z-10 rounded-2xl border border-dashed border-[#2F9FE8]/30 bg-white/75 p-4 text-sm font-bold text-[#0E4A7B]">
              今日の棚に並べる未読作品がありません。読んだ履歴をリセットするか、新しい作品を追加してください。
            </p>
          )}
        </section>

        <section className="ocean-panel grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#2F9FE8]" aria-hidden size={22} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="タイトル、作者、紹介文で検索"
              className="min-h-14 w-full rounded-2xl border border-[#2F9FE8]/20 bg-white/92 px-12 text-base text-[#17324D] outline-none transition placeholder:text-[#667085] focus:border-[#2F9FE8] focus:ring-4 focus:ring-[#2F9FE8]/15"
            />
          </label>
          <div className="grid grid-cols-3 gap-2 sm:w-[22rem]">
            {(["すべて", "お気に入り", "あとで読む"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setViewFilter(option)}
                className={`min-h-11 rounded-2xl border px-2 text-sm font-bold transition ${
                  viewFilter === option
                    ? "border-[#2F9FE8] bg-[#2F9FE8] text-white shadow-sm"
                    : "border-[#2F9FE8]/20 bg-white text-[#0E4A7B] hover:border-[#2F9FE8]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </section>

        <section className="ocean-panel flex flex-col gap-4 p-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["すべて", ...genres] as const).map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => setGenreFilter(genre)}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition ${
                  genreFilter === genre
                    ? "border-[#2F9FE8] bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] text-white shadow-sm"
                    : "border-[#2F9FE8]/20 bg-white/82 text-[#0E4A7B] hover:border-[#2F9FE8]"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["すべて", ...priceTypes] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPriceFilter(type)}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition ${
                  priceFilter === type
                    ? "border-[#2F9FE8] bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] text-white shadow-sm"
                    : "border-[#2F9FE8]/20 bg-white/82 text-[#0E4A7B] hover:border-[#2F9FE8]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              aria-pressed={showReadItems}
              onClick={() => setShowReadItems((current) => !current)}
                className={`inline-flex min-h-10 items-center justify-center rounded-2xl border px-4 text-sm font-bold transition ${
                showReadItems
                  ? "border-[#2F9FE8] bg-[#2F9FE8] text-white"
                  : "border-[#2F9FE8]/20 bg-white/82 text-[#0E4A7B] hover:border-[#2F9FE8]"
              }`}
            >
              読んだ済み作品を表示
            </button>
            {readHistory.length > 0 && (
              <button
                type="button"
                onClick={resetReadHistory}
                className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#2F9FE8]/20 bg-white/82 px-4 text-sm font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8]"
              >
                読んだ履歴をリセット
              </button>
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <StatusCard label="表示中" value={`${filteredItems.length}件`} icon={<BookOpen aria-hidden size={20} />} />
          <StatusCard label="読了目安" value={`${totalMinutes}分`} icon={<Clock3 aria-hidden size={20} />} />
          <StatusCard label="保存済み" value={`${new Set([...favorites, ...readLater]).size}件`} icon={<Sparkles aria-hidden size={20} />} />
        </section>

        <section id="ai-recommendations" className="ocean-recommend grid scroll-mt-8 gap-5 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#2F9FE8]">AIおすすめ</p>
              <h2 className="text-2xl font-black text-[#0E4A7B]">あなたへのおすすめ</h2>
            </div>
            <button
              type="button"
              onClick={() => setRecommendationSeed((current) => current + 1)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#2F9FE8]/35 bg-white/82 px-4 text-sm font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8] hover:bg-[#DDF3FF]"
            >
              <RefreshCw aria-hidden size={18} />
              更新
            </button>
          </div>

          {recommendations.length > 0 ? (
            <div className="relative z-10 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {recommendations.map((recommendation) => (
                <article key={recommendation.item.id} className="grid gap-3 rounded-[20px] border border-[#2F9FE8]/16 bg-white/88 p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#DDF3FF] px-3 py-1 text-xs font-bold text-[#0E4A7B]">
                      {recommendation.item.genre}
                    </span>
                    <span className="rounded-full bg-[#F7F1E5] px-3 py-1 text-xs font-bold text-[#17324D]">
                      {recommendation.item.readingMinutes}分
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900">
                      {recommendation.item.priceType}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-snug text-[#0E4A7B]">{recommendation.item.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[#667085]">{recommendation.item.author}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recommendation.reasons.map((reason) => (
                      <span key={reason} className="rounded-full border border-[#2F9FE8]/20 bg-[#EEF9FF] px-2.5 py-1 text-xs font-bold text-[#0E4A7B]">
                        {reason}
                      </span>
                    ))}
                  </div>
                  <a
                    href={recommendation.item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] px-3 text-sm font-bold text-white transition hover:brightness-105"
                  >
                    <ExternalLink aria-hidden size={17} />
                    読みに行く
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-[#2F9FE8]/35 bg-white/75 p-4 text-sm font-bold text-[#0E4A7B]">
              新しい作品を登録するとおすすめ精度が上がります
            </p>
          )}

          {recommendationCandidates.length < 5 && recommendations.length > 0 && (
            <p className="text-sm font-semibold text-[#667085]">新しい作品を登録するとおすすめ精度が上がります</p>
          )}
        </section>

        {adminOpen && (
          <section className="ocean-admin grid gap-5 bg-white/86 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-[#0E4A7B]">{editingId ? "作品を編集" : "作品を登録"}</h2>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={collectReadings}
                    disabled={collectStatus.type === "loading"}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#2F9FE8] bg-[#2F9FE8] px-3 text-sm font-bold text-white transition hover:bg-[#0E4A7B] disabled:cursor-wait disabled:opacity-70"
                  >
                    おすすめを増やす
                  </button>
                  <button
                    type="button"
                    onClick={resetReadHistory}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#2F9FE8]/20 bg-white px-3 text-sm font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8]"
                  >
                    読んだ履歴をリセット
                  </button>
                  <button
                    type="button"
                    onClick={resetSamples}
                    className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-[#2F9FE8]/20 bg-white px-3 text-sm font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8]"
                  >
                    初期データに戻す
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="タイトル" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
                <TextField label="作者" value={form.author} onChange={(value) => setForm({ ...form, author: value })} required />
                <label className="grid gap-2 text-sm font-bold text-[#0E4A7B]">
                  ジャンル
                  <select
                    value={form.genre}
                    onChange={(event) => setForm({ ...form, genre: event.target.value as Genre })}
                    className="min-h-12 rounded-2xl border border-[#2F9FE8]/20 bg-white px-3 text-base text-[#17324D] outline-none focus:border-[#2F9FE8] focus:ring-4 focus:ring-[#2F9FE8]/15"
                  >
                    {genres.map((genre) => (
                      <option key={genre}>{genre}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#0E4A7B]">
                  無料 / 有料
                  <select
                    value={form.priceType}
                    onChange={(event) => setForm({ ...form, priceType: event.target.value as PriceType })}
                    className="min-h-12 rounded-2xl border border-[#2F9FE8]/20 bg-white px-3 text-base text-[#17324D] outline-none focus:border-[#2F9FE8] focus:ring-4 focus:ring-[#2F9FE8]/15"
                  >
                    {priceTypes.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <TextField
                  label="読了目安"
                  type="number"
                  value={String(form.readingMinutes)}
                  onChange={(value) => setForm({ ...form, readingMinutes: Number(value) })}
                  required
                />
                <TextField label="元サイト名" value={form.sourceName} onChange={(value) => setForm({ ...form, sourceName: value })} required />
                <TextField label="元サイトリンク" type="url" value={form.sourceUrl} onChange={(value) => setForm({ ...form, sourceUrl: value })} required />
              </div>

              <TextArea label="紹介文" value={form.description} onChange={(value) => setForm({ ...form, description: value })} required />
              <TextArea label="短い抜粋" value={form.excerpt} onChange={(value) => setForm({ ...form, excerpt: value })} required />

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] px-4 text-base font-bold text-white transition hover:brightness-105"
                >
                  <Plus aria-hidden size={20} />
                  {editingId ? "更新する" : "登録する"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#2F9FE8]/20 bg-white px-4 text-base font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8]"
                  >
                    <X aria-hidden size={20} />
                    編集をやめる
                  </button>
                )}
              </div>
            </form>

            <div className="grid max-h-[36rem] gap-3 overflow-y-auto rounded-[20px] border border-[#2F9FE8]/16 bg-white/88 p-3">
              <h2 className="text-lg font-black text-[#0E4A7B]">登録済み作品</h2>
              {items.map((item) => (
                <article key={item.id} className="grid gap-3 rounded-2xl border border-[#2F9FE8]/12 bg-[#EEF9FF]/55 p-3">
                  <div>
                    <p className="font-bold text-[#0E4A7B]">{item.title}</p>
                    <p className="text-sm text-[#667085]">
                      {item.author} / {item.genre} / {item.priceType}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => editItem(item)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#2F9FE8]/20 bg-white text-sm font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8]"
                    >
                      <Edit3 aria-hidden size={17} />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white text-sm font-bold text-red-700 transition hover:border-red-400"
                    >
                      <Trash2 aria-hidden size={17} />
                      削除
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {displayedItems.map((item) => {
            const isFavorite = favorites.includes(item.id);
            const isReadLater = readLater.includes(item.id);
            const isRead = readHistory.includes(item.id);

            return (
              <article
                key={item.id}
                className="reading-card result-card flex min-h-[24rem] flex-col p-5"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#DDF3FF] px-3 py-1 text-xs font-bold text-[#0E4A7B]">{item.genre}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        item.priceType === "無料" ? "bg-emerald-100 text-emerald-900" : "bg-[#F3E4C8] text-[#17324D]"
                      }`}
                    >
                      {item.priceType}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF9FF] px-2 py-1 text-sm font-bold text-[#0E4A7B]">
                    <Clock3 aria-hidden size={16} />
                    {item.readingMinutes}分
                  </span>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-2xl font-black leading-snug text-[#0E4A7B]">{item.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-[#667085]">{item.author}</p>
                  </div>
                  <p className="text-base leading-7 text-[#17324D]/82">{item.description}</p>
                  <blockquote className="rounded-r-2xl border-l-4 border-[#F3E4C8] bg-[#F7F1E5]/78 py-3 pl-4 text-base leading-7 text-[#17324D]/82">
                    {item.excerpt}
                  </blockquote>
                </div>

                <div className="mt-5 grid gap-2 border-t border-[#2F9FE8]/12 pt-4">
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] px-4 text-base font-bold text-white transition hover:brightness-105"
                  >
                    <ExternalLink aria-hidden size={19} />
                    {item.sourceName}で読む
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={isFavorite}
                      onClick={() => toggleList(item.id, setFavorites, favorites)}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition ${
                        isFavorite
                          ? "border-rose-700 bg-rose-700 text-white"
                          : "border-[#2F9FE8]/20 bg-white text-[#0E4A7B] hover:border-rose-300 hover:bg-[#EEF9FF]"
                      }`}
                    >
                      <Heart aria-hidden size={18} fill={isFavorite ? "currentColor" : "none"} />
                      お気に入り
                    </button>
                    <button
                      type="button"
                      aria-pressed={isReadLater}
                      onClick={() => toggleList(item.id, setReadLater, readLater)}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition ${
                        isReadLater
                          ? "border-emerald-800 bg-emerald-800 text-white"
                          : "border-[#2F9FE8]/20 bg-white text-[#0E4A7B] hover:border-emerald-300 hover:bg-[#EEF9FF]"
                      }`}
                    >
                      <Bookmark aria-hidden size={18} fill={isReadLater ? "currentColor" : "none"} />
                      あとで読む
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-pressed={isRead}
                    onClick={() => toggleRead(item.id)}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-sm font-bold transition ${
                      isRead
                        ? "border-[#0E4A7B] bg-[#0E4A7B] text-white"
                        : "border-[#2F9FE8]/20 bg-white text-[#0E4A7B] hover:border-[#2F9FE8] hover:bg-[#EEF9FF]"
                    }`}
                  >
                    <BookOpen aria-hidden size={18} />
                    {isRead ? "読んだ済み" : "読んだ"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        <div ref={loadMoreRef} aria-hidden className="h-8" />

        {process.env.NODE_ENV === "development" && (
          <div className="mx-auto grid gap-1 rounded-2xl border border-[#2F9FE8]/15 bg-white/65 px-4 py-3 text-center text-[11px] font-semibold text-[#667085]">
            <span>filteredItems: {filteredItems.length}件</span>
            <span>displayedItems: {displayedItems.length}件</span>
            <span>visibleCount: {visibleCount}件</span>
          </div>
        )}

        {filteredItems.length > displayedItems.length && (
          <button
            type="button"
            onClick={handleLoadMoreClick}
            className="mx-auto inline-flex min-h-14 w-full max-w-lg items-center justify-center rounded-2xl border border-[#2F9FE8]/25 bg-white/88 px-6 text-base font-black text-[#0E4A7B] shadow-[0_16px_36px_rgba(14,74,123,0.12)] transition hover:border-[#2F9FE8] hover:bg-[#DDF3FF]"
          >
            さらに表示
          </button>
        )}

        {filteredItems.length === 0 && (
          <section className="rounded-[22px] border border-dashed border-[#2F9FE8]/35 bg-white/76 p-8 text-center shadow-sm">
            {unreadItemsCount === 0 ? (
              <>
                <p className="text-lg font-black text-[#0E4A7B]">すべて読み終えました</p>
                <p className="mt-2 text-[#667085]">読んだ履歴を戻すか、新しい作品を棚に追加できます。</p>
                <div className="mt-5 grid gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={resetReadHistory}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#2F9FE8] to-[#0E4A7B] px-4 text-sm font-bold text-white transition hover:brightness-105"
                  >
                    読んだ履歴をリセット
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminOpen(true)}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#2F9FE8]/20 bg-white px-4 text-sm font-bold text-[#0E4A7B] transition hover:border-[#2F9FE8]"
                  >
                    作品を追加する
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-lg font-black text-[#0E4A7B]">この条件の未読作品はありません</p>
                <p className="mt-2 text-[#667085]">条件を変えるか、読んだ済み作品の表示をオンにしてみてください。</p>
              </>
            )}
          </section>
        )}

        <footer className="prelaunch-footer">
          <p className="text-xl font-black text-[#0E4A7B] sm:text-2xl">読む棚</p>
          <p className="text-base font-bold leading-7 text-[#17324D] sm:text-lg">今日も、いい文章と出会おう。</p>
          <p className="text-sm font-semibold leading-7 text-[#17324D]/78 sm:text-base">波のように、新しい物語が流れ着く。</p>
          <p className="text-xs font-bold text-[#0E4A7B]/68 sm:text-sm">© 2026 読む棚</p>
        </footer>
      </section>
    </main>
  );
}

function StatusCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="ocean-panel flex items-center gap-3 p-4">
      <span className="grid size-12 place-items-center rounded-full bg-[#2F9FE8] text-white shadow-sm">{icon}</span>
      <div>
        <p className="text-sm font-bold text-[#667085]">{label}</p>
        <p className="text-3xl font-black text-[#0E4A7B]">{value}</p>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#0E4A7B]">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        min={type === "number" ? 1 : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-2xl border border-[#2F9FE8]/20 bg-white px-3 text-base text-[#17324D] outline-none transition focus:border-[#2F9FE8] focus:ring-4 focus:ring-[#2F9FE8]/15"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#0E4A7B]">
      {label}
      <textarea
        value={value}
        required={required}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y rounded-2xl border border-[#2F9FE8]/20 bg-white px-3 py-3 text-base leading-7 text-[#17324D] outline-none transition focus:border-[#2F9FE8] focus:ring-4 focus:ring-[#2F9FE8]/15"
      />
    </label>
  );
}
