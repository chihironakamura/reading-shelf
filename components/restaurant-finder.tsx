"use client";

import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChefHat,
  ChevronRight,
  Clock3,
  Home,
  LocateFixed,
  LoaderCircle,
  MapPin,
  MessageCircleQuestion,
  Navigation,
  Search,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import LeafletMap from "@/components/LeafletMap";
import type { Coordinates, Restaurant } from "@/lib/places";
import {
  Budget,
  CookingMode,
  DistancePreference,
  HomeCookingSuggestion,
  Mood,
  recommendFoods, 
　recommendHomeRecipes,
　recommendFromRecentMeals, 
　recommendFromYesterday,
} from "@/lib/recommendations";

const examples = [
  "ラーメン",
  "焼肉",
  "カレー",
  "寿司",
  "カフェ",
  "コンビニ",
  "スーパー",
  "和食",
  "中華",
  "イタリアン",
  "居酒屋",
  "焼鳥",
  "うどん",
  "そば",
  "定食",
  "韓国料理",
  "ハンバーガー",
  "ステーキ",
  "スイーツ",
];
const radii = [1, 3, 5] as const;

const moodOptions: { value: Mood; label: string }[] = [
  { value: "hearty", label: "がっつり" },
  { value: "light", label: "あっさり" },
  { value: "drinks", label: "ちょい飲み" },
  { value: "sweet", label: "甘いもの" },
  { value: "unsure", label: "迷ってる" },
];
const budgetOptions: { value: Budget; label: string }[] = [
  { value: "low", label: "安め" },
  { value: "normal", label: "普通" },
  { value: "treat", label: "ちょっと贅沢" },
];
const distanceOptions: { value: DistancePreference; label: string }[] = [
  { value: "near", label: "近場優先" },
  { value: "walk", label: "少し歩いてもOK" },
];

type RequestState = "idle" | "loading" | "success" | "error";
type DiagnosisMood = "hearty" | "light" | "either";
type DiagnosisBudget = "under1000" | "1000to2000" | "any";
type DiagnosisCompany = "alone" | "together" | "drinks";

const diagnosisCandidates: {
  name: string;
  moods: DiagnosisMood[];
  budgets: DiagnosisBudget[];
  companies: DiagnosisCompany[];
}[] = [
  { name: "ラーメン", moods: ["hearty", "either"], budgets: ["under1000", "1000to2000", "any"], companies: ["alone"] },
  { name: "定食", moods: ["hearty", "light", "either"], budgets: ["under1000", "1000to2000", "any"], companies: ["alone", "together"] },
  { name: "カレー", moods: ["hearty", "either"], budgets: ["under1000", "1000to2000", "any"], companies: ["alone", "together"] },
  { name: "和食", moods: ["light", "either"], budgets: ["1000to2000", "any"], companies: ["alone", "together"] },
  { name: "寿司", moods: ["light", "either"], budgets: ["1000to2000", "any"], companies: ["together"] },
  { name: "イタリアン", moods: ["light", "either"], budgets: ["1000to2000", "any"], companies: ["together", "drinks"] },
  { name: "居酒屋", moods: ["hearty", "light", "either"], budgets: ["1000to2000", "any"], companies: ["together", "drinks"] },
  { name: "焼鳥", moods: ["hearty", "either"], budgets: ["under1000", "1000to2000", "any"], companies: ["alone", "together", "drinks"] },
  { name: "韓国料理", moods: ["hearty", "either"], budgets: ["1000to2000", "any"], companies: ["together", "drinks"] },
];

function distanceLabel(distanceKm: number) {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)}km`;
}

function diagnoseGenres(
  mood: DiagnosisMood | null,
  budget: DiagnosisBudget | null,
  company: DiagnosisCompany | null,
) {
  if (!mood || !budget || !company) return [];

  return diagnosisCandidates
    .map((candidate, index) => ({
      name: candidate.name,
      score:
        (candidate.moods.includes(mood) ? 4 : 0) +
        (candidate.budgets.includes(budget) ? 2 : 0) +
        (candidate.companies.includes(company) ? 5 : 0) -
        index * 0.001,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ name }) => name);
}

export function RestaurantFinder() {
  const [cookingMode, setCookingMode] = useState<CookingMode>("eatOut");
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientInput, setIngredientInput] = useState("");
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [radiusKm, setRadiusKm] = useState<(typeof radii)[number]>(3);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [initialLocationCheck, setInitialLocationCheck] = useState(true);
  const [locationError, setLocationError] = useState("");
  const autoLocationAttempted = useRef(false);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searchedRadiusKm, setSearchedRadiusKm] = useState<(typeof radii)[number]>(3);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [diagnosisMood, setDiagnosisMood] = useState<DiagnosisMood | null>(null);
  const [diagnosisBudget, setDiagnosisBudget] = useState<DiagnosisBudget | null>(null);
  const [diagnosisCompany, setDiagnosisCompany] = useState<DiagnosisCompany | null>(null);
　const [showAdvisor, setShowAdvisor] = useState(true);
  const [mood, setMood] = useState<Mood | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [distance, setDistance] = useState<DistancePreference | null>(null);
　const [yesterdayFood, setYesterdayFood] = useState("");
　const [recentMeals, setRecentMeals] = useState(["", "", ""]);

  const suggestions = useMemo(
  () =>
    mood && budget && distance
      ? recommendFoods({ mood, budget, distance })
      : [],
  [mood, budget, distance],
);

const yesterdaySuggestions = useMemo(
  () => recommendFromYesterday(yesterdayFood),
  [yesterdayFood],
);

const recentMealSuggestions = useMemo(
  () => recommendFromRecentMeals(recentMeals),
  [recentMeals],
);

const homeRecipes = useMemo(
  () => recommendHomeRecipes([...ingredients, ingredientInput.trim()].filter(Boolean).join("、")),
  [ingredientInput, ingredients],
);

const diagnosisResults = useMemo(
  () => diagnoseGenres(diagnosisMood, diagnosisBudget, diagnosisCompany),
  [diagnosisBudget, diagnosisCompany, diagnosisMood],
);

  function addIngredients(newIngredients: string[]) {
    setIngredients((currentIngredients) => {
      const normalizedIngredients = new Set(
        currentIngredients.map((ingredient) => ingredient.toLocaleLowerCase("ja")),
      );
      const additions = newIngredients
        .map((ingredient) => ingredient.trim())
        .filter(Boolean)
        .filter((ingredient) => {
          const normalizedIngredient = ingredient.toLocaleLowerCase("ja");
          if (normalizedIngredients.has(normalizedIngredient)) return false;
          normalizedIngredients.add(normalizedIngredient);
          return true;
        });

      return [...currentIngredients, ...additions];
    });
    setOpenRecipe(null);
  }

  function updateIngredientInput(value: string) {
    const parts = value.split(/[,、，\s　]+/);
    const hasDelimiter = /[,、，\s　]/.test(value);

    if (!hasDelimiter) {
      setIngredientInput(value);
      setOpenRecipe(null);
      return;
    }

    const endsWithDelimiter = /[,、，\s　]$/.test(value);
    addIngredients(endsWithDelimiter ? parts : parts.slice(0, -1));
    setIngredientInput(endsWithDelimiter ? "" : parts.at(-1) ?? "");
  }

  function commitIngredientInput() {
    if (!ingredientInput.trim()) return;
    addIngredients([ingredientInput]);
    setIngredientInput("");
  }

  function removeIngredient(ingredientToRemove: string) {
    setIngredients((currentIngredients) =>
      currentIngredients.filter((ingredient) => ingredient !== ingredientToRemove),
    );
    setOpenRecipe(null);
  }

  function clearIngredients() {
    setIngredients([]);
    setIngredientInput("");
    setOpenRecipe(null);
  }

  function getCurrentLocation() {
    if (coordinates || locationLoading) return;

    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("この端末では現在地を取得できません。");
      setInitialLocationCheck(false);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationLoading(false);
        setInitialLocationCheck(false);
      },
      () => {
        setCoordinates(null);
        setLocationError("現在地を取得できませんでした。ブラウザの位置情報を許可して、もう一度お試しください。");
        setLocationLoading(false);
        setInitialLocationCheck(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    if (autoLocationAttempted.current || coordinates || locationLoading) return;

    autoLocationAttempted.current = true;
    getCurrentLocation();
  }, []);

function updateRecentMeal(index: number, value: string) {
  setRecentMeals((currentMeals) =>
    currentMeals.map((meal, mealIndex) =>
      mealIndex === index ? value : meal,
    ),
  );
}

  function useSuggestion(food: string) {
    setQuery(food);
    setShowAdvisor(false);
    setError("");
    window.setTimeout(() => document.getElementById("food-query")?.focus(), 50);
  }

  async function runRestaurantSearch(searchQuery: string) {
    if (!coordinates) {
      setError("先に現在地を取得してください。");
      setRequestState("error");
      return;
    }

    const trimmedQuery = searchQuery.trim();
    setRequestState("loading");
    setError("");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery, radiusKm, ...coordinates }),
      });
      const data = (await response.json()) as { restaurants?: Restaurant[]; error?: string };

      if (!response.ok) throw new Error(data.error ?? "検索中にエラーが発生しました。");

      setRestaurants(data.restaurants ?? []);
      setSearchedQuery(trimmedQuery || "すべての飲食店");
      setSearchedRadiusKm(radiusKm);
      setSelectedRestaurantId(null);
      setRequestState("success");
      window.setTimeout(() => document.getElementById("results")?.scrollIntoView(), 50);
    } catch (searchError) {
      setRestaurants([]);
      setError(searchError instanceof Error ? searchError.message : "検索中にエラーが発生しました。");
      setRequestState("error");
    }
  }

  function searchRestaurants(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runRestaurantSearch(query);
  }

  function searchDiagnosisResult() {
    const topGenre = diagnosisResults[0];
    if (!topGenre) return;

    setQuery(topGenre);
    setShowDiagnosis(false);
    void runRestaurantSearch(topGenre);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl overflow-x-clip px-4 pb-36 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-8 md:px-8 lg:max-w-[1200px] lg:px-8 lg:pb-12 xl:px-0">
      <header className="mb-5 flex items-center gap-3 lg:mb-7">
        <div className="grid size-11 place-items-center rounded-2xl bg-forest text-white shadow-lg shadow-forest/20">
          <Utensils className="size-5" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-[11px] font-black tracking-[0.15em] text-coral">WHAT TO EAT TODAY?</p>
          <p className="text-sm font-black text-ink">今日のごはん</p>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2 rounded-[1.4rem] border border-forest/10 bg-white/80 p-1.5 shadow-sm" aria-label="食事方法を選択">
        <button
          type="button"
          aria-pressed={cookingMode === "eatOut"}
          onClick={() => setCookingMode("eatOut")}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition ${cookingMode === "eatOut" ? "bg-forest text-white shadow-md" : "text-ink/50 hover:bg-cream"}`}
        >
          <Utensils className="size-4" />
          外食
        </button>
        <button
          type="button"
          aria-pressed={cookingMode === "cookAtHome"}
          onClick={() => setCookingMode("cookAtHome")}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition ${cookingMode === "cookAtHome" ? "bg-coral text-white shadow-md" : "text-ink/50 hover:bg-cream"}`}
        >
          <Home className="size-4" />
          家で調理
        </button>
      </div>

     {cookingMode === "eatOut" ? (
     <div className="grid min-w-0 gap-8 lg:grid-cols-[460px_minmax(0,1fr)] lg:items-start lg:gap-8 xl:grid-cols-[480px_minmax(0,1fr)] xl:gap-10">
        <div className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
      <section className="relative overflow-hidden rounded-[2rem] bg-forest px-5 py-8 text-white shadow-card sm:px-9 sm:py-10 lg:px-7 lg:py-9">
        <div className="absolute -right-16 -top-24 size-56 rounded-full border-[38px] border-white/5" />
        <div className="absolute -bottom-12 -left-10 size-36 rounded-full bg-coral/25 blur-2xl" />
        <div className="relative">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/85">近くのお店を、さっと探そう</span>
          <h1 className="mt-4 text-[2.65rem] font-black leading-[1.12] tracking-[-0.06em] sm:text-5xl lg:text-[2.75rem]">
            今日の
            <br />
            <span className="text-[#ffd178]">ごはん</span>
          </h1>
          <p className="mt-4 max-w-md text-sm font-bold leading-7 text-white/75 sm:text-base">
            食べたいものが決まってても、
            <br className="sm:hidden" />決まってなくても。
          </p>
          <button
            type="button"
            onClick={() => setShowDiagnosis((current) => !current)}
            className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#ffd178] px-5 py-3 text-base font-black text-forest shadow-lg shadow-black/10 transition active:scale-[0.99] sm:w-auto"
          >
            <Sparkles className="size-5" />
            診断して決める
          </button>
        </div>
      </section>

      {showDiagnosis && (
        <DiagnosisPanel
          mood={diagnosisMood}
          budget={diagnosisBudget}
          company={diagnosisCompany}
          results={diagnosisResults}
          onMoodChange={setDiagnosisMood}
          onBudgetChange={setDiagnosisBudget}
          onCompanyChange={setDiagnosisCompany}
          onSearch={searchDiagnosisResult}
          searching={requestState === "loading"}
        />
      )}

      <form id="restaurant-search" onSubmit={searchRestaurants} className={`relative rounded-[1.75rem] border border-forest/10 bg-white p-4 shadow-card sm:p-6 ${showDiagnosis ? "mt-4" : "-mt-3"}`}>
        <label htmlFor="food-query" className="mb-2.5 block text-sm font-black text-ink">食べたい料理・素材</label>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 size-6 -translate-y-1/2 text-leaf" />
          <input
            id="food-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例：ラーメン、焼肉、カフェ"
            enterKeyHint="search"
            autoComplete="off"
            className="h-16 w-full rounded-2xl border border-forest/15 bg-[#fbfaf6] pl-14 pr-4 text-lg font-bold text-ink outline-none transition placeholder:text-base placeholder:font-medium placeholder:text-ink/35 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
          />
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6" aria-label="人気ジャンル">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => setQuery(example)} className="min-h-11 shrink-0 rounded-full bg-cream px-4 py-2 text-sm font-bold text-forest transition active:scale-95 active:bg-forest active:text-white">
              {example}
            </button>
          ))}
        </div>

        <fieldset className="mt-6">
          <legend className="mb-2.5 text-sm font-black text-ink">検索半径</legend>
          <div className="grid grid-cols-3 gap-2">
            {radii.map((radius) => (
              <label key={radius} className="cursor-pointer">
                <input type="radio" name="radius" value={radius} checked={radiusKm === radius} onChange={() => setRadiusKm(radius)} className="peer sr-only" />
                <span className="flex h-12 items-center justify-center rounded-full border border-forest/10 bg-cream text-sm font-bold text-ink/55 transition peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-checked:shadow-md">{radius}km</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button type="button" onClick={getCurrentLocation} disabled={locationLoading} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-forest/20 bg-white text-base font-black text-forest transition active:scale-[0.99] active:bg-cream disabled:cursor-wait disabled:opacity-70">
          {locationLoading ? <LoaderCircle className="size-5 animate-spin" /> : coordinates ? <Check className="size-5" /> : <LocateFixed className="size-5" />}
          {locationLoading
            ? initialLocationCheck
              ? "現在地を確認しています..."
              : "現在地を取得中..."
            : coordinates
              ? "現在地を取得しました"
              : "現在地を取得"}
        </button>

        <button
  type="button"
  onClick={() => setShowAdvisor((value) => !value)}
  className={`mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black leading-5 transition active:scale-[0.99]
  ${
    showAdvisor
      ? "bg-forest text-white shadow-md"
      : "bg-[#fff1c9] text-[#7a5410]"
  }`}
>
  <MessageCircleQuestion className="size-5 shrink-0" />

  {showAdvisor
    ? "▲ おすすめ提案を閉じる"
    : "▼ 決められないからおすすめしてもらう"}
</button>

        <button form="restaurant-search" type="submit" disabled={requestState === "loading" || locationLoading} className="mt-4 hidden h-16 w-full items-center justify-center gap-2 rounded-2xl bg-coral text-lg font-black text-white shadow-lg shadow-coral/25 transition hover:bg-[#e86749] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 lg:flex">
          {requestState === "loading" ? <LoaderCircle className="size-6 animate-spin" /> : <Search className="size-6" />}
          {requestState === "loading" ? "お店を検索中..." : "近くのお店を探す"}
        </button>

        {locationError && <ErrorMessage message={locationError} />}
        {requestState === "error" && error && <ErrorMessage message={error} />}
      </form>

      {showAdvisor && (
        <section className="relative mt-7 rounded-[1.75rem] border-2 border-[#f1c96f] bg-[#fff9e9] p-5 shadow-card sm:p-6">
          <div className="absolute -top-3 left-9 size-6 rotate-45 border-l-2 border-t-2 border-[#f1c96f] bg-[#fff9e9]" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[#7a5410]">
              <Sparkles className="size-5" />
              <h2 className="text-lg font-black">今日の気分を教えて</h2>
            </div>
            <p className="mt-1 text-xs font-bold leading-5 text-[#7a5410]/65">3つ答えると、料理ジャンルを3つ提案します。</p>

           <section className="mt-5 rounded-2xl border border-[#e6cf99] bg-white/80 p-4 sm:p-5">
  <div className="flex items-start gap-3">
    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#fff1c9] text-sm">
      🍚
    </div>

    <div className="min-w-0 flex-1">
      <h3 className="text-base font-black text-ink">
        昨日食べたものから提案
      </h3>
      <p className="mt-1 text-xs font-medium leading-5 text-ink/50">
        昨日とは違う系統の料理を3つ選びます。
      </p>
    </div>
  </div>

  <label
    htmlFor="yesterday-food"
    className="mt-4 block text-sm font-black text-ink"
  >
    昨日何食べた？
  </label>

  <input
    id="yesterday-food"
    type="text"
    value={yesterdayFood}
    onChange={(event) => setYesterdayFood(event.target.value)}
    placeholder="例：焼肉、ラーメン、寿司"
    autoComplete="off"
    className="mt-2 h-14 w-full min-w-0 rounded-2xl border border-forest/15 bg-white px-4 text-base font-bold text-ink outline-none transition placeholder:font-medium placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
  />

  <div className="mt-3 flex flex-wrap gap-2">
    {["焼肉", "ラーメン", "寿司"].map((food) => (
      <button
        key={food}
        type="button"
        onClick={() => setYesterdayFood(food)}
        className="min-h-10 rounded-full bg-cream px-3.5 py-2 text-xs font-bold text-forest transition active:scale-95"
      >
        {food}
      </button>
    ))}
  </div>

  {yesterdaySuggestions.length > 0 && (
    <div className="mt-5 space-y-3 border-t border-forest/10 pt-4">
      <p className="text-sm font-black text-[#7a5410]">
        今日はこちらがおすすめ
      </p>

      {yesterdaySuggestions.map((suggestion, index) => (
        <article
          key={suggestion.name}
          className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest text-xs font-black text-white">
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <h4 className="text-lg font-black text-ink">
                {suggestion.name}
              </h4>

              <p className="mt-1 text-xs font-medium leading-5 text-ink/55">
                {suggestion.reason}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => useSuggestion(suggestion.name)}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral px-4 py-3 text-sm font-black text-white transition active:scale-[0.99]"
          >
            この料理で探す
            <ChevronRight className="size-4" />
          </button>
        </article>
      ))}
    </div>
  )}
</section>

<section className="mt-4 rounded-2xl border border-forest/10 bg-white/80 p-4 sm:p-5">
  <div className="flex items-start gap-3">
    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-forest/10 text-lg">
      📅
    </div>

    <div className="min-w-0 flex-1">
      <h3 className="text-base font-black text-ink">
        最近3日間の食事から提案
      </h3>

      <p className="mt-1 text-xs font-medium leading-5 text-ink/50">
        最近の食事の偏りを見て、違う系統の料理を選びます。
      </p>
    </div>
  </div>

  <div className="mt-4 grid gap-3">
    {[
      { label: "昨日", placeholder: "例：焼肉" },
      { label: "一昨日", placeholder: "例：ラーメン" },
      { label: "3日前", placeholder: "例：カレー" },
    ].map((field, index) => (
      <label key={field.label} className="block">
        <span className="mb-1.5 block text-xs font-black text-ink/65">
          {field.label}
        </span>

        <input
          type="text"
          value={recentMeals[index] ?? ""}
          onChange={(event) =>
            updateRecentMeal(index, event.target.value)
          }
          placeholder={field.placeholder}
          autoComplete="off"
          className="h-14 w-full min-w-0 rounded-xl border border-forest/15 bg-white px-4 text-base font-bold text-ink outline-none transition placeholder:text-sm placeholder:font-medium placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
        />
      </label>
    ))}
  </div>

  <p className="mt-3 text-[11px] font-medium leading-5 text-ink/40">
    空欄は無視されます。1日分だけでも提案できます。
  </p>

  {recentMealSuggestions.length > 0 && (
    <div className="mt-5 border-t border-forest/10 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-forest">
          今日はこちらがおすすめ
        </p>

        <span className="shrink-0 rounded-full bg-forest/10 px-2.5 py-1 text-[10px] font-black text-forest">
          3日分から判定
        </span>
      </div>

      <div className="grid gap-3">
        {recentMealSuggestions.map((suggestion, index) => (
          <article
            key={suggestion.name}
            className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest text-xs font-black text-white">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <h4 className="text-lg font-black text-ink">
                  {suggestion.name}
                </h4>

                <p className="mt-1 text-xs font-medium leading-5 text-ink/55">
                  {suggestion.reason}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => useSuggestion(suggestion.name)}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral px-4 py-3 text-sm font-black text-white transition hover:bg-[#e86749] active:scale-[0.99]"
            >
              この料理で探す
              <ChevronRight className="size-4" />
            </button>
          </article>
        ))}
      </div>
    </div>
  )}
</section>

 <QuestionChips number="1" title="今の気分" options={moodOptions} value={mood} onChange={setMood} />
            <QuestionChips number="2" title="予算" options={budgetOptions} value={budget} onChange={setBudget} />
            <QuestionChips number="3" title="距離" options={distanceOptions} value={distance} onChange={setDistance} />

            {suggestions.length > 0 && (
              <div className="mt-6 border-t border-[#d9ad51]/30 pt-5">
                <p className="mb-3 text-sm font-black text-[#7a5410]">こんなごはんはどう？</p>
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <article key={suggestion.name} className="rounded-2xl bg-white p-4 shadow-sm">
                      <h3 className="text-lg font-black text-ink">{suggestion.name}</h3>
                      <p className="mt-1 text-xs font-medium leading-5 text-ink/55">{suggestion.reason}</p>
                      <button type="button" onClick={() => useSuggestion(suggestion.name)} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-coral text-sm font-black text-white active:scale-[0.99]">
                        この料理で探す
                        <ChevronRight className="size-4" />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

        </div>

    <section id="results" className="min-w-0 scroll-mt-5 pt-2 lg:min-h-[calc(100vh-7rem)] lg:rounded-[2rem] lg:border lg:border-forest/10 lg:bg-white/55 lg:p-6 lg:shadow-[0_24px_70px_rgba(31,74,62,0.08)] lg:backdrop-blur-sm xl:p-8">
        {requestState === "idle" && (
          <div className="rounded-[1.75rem] border border-dashed border-forest/20 px-6 py-9 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-forest/5 text-leaf"><MapPin className="size-5" /></div>
            <p className="mt-4 text-sm font-black text-ink">料理名が空欄でも、近くの飲食店を探せます</p>
            <p className="mt-1 text-xs leading-6 text-ink/50">OpenStreetMapの無料データを距離順で表示します。</p>
          </div>
        )}

        {requestState === "loading" && (
          <div className="space-y-4" aria-live="polite" aria-label="検索中">
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-forest px-5 py-4 text-sm font-bold text-white shadow-card">
              <LoaderCircle className="size-5 animate-spin text-[#ffd178]" />近くのお店を探しています
            </div>
            {[0, 1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-[1.75rem] bg-white/70" />)}
          </div>
        )}

        {requestState === "success" && restaurants.length === 0 && (
          <div className="rounded-[1.75rem] bg-white px-6 py-12 text-center shadow-card">
            <p className="text-lg font-black">現在地周辺に該当するお店が見つかりません</p>
            <p className="mt-2 text-sm leading-6 text-ink/55">料理名を短くするか、検索範囲を広げてお試しください。</p>
          </div>
        )}

        {requestState === "success" && restaurants.length > 0 && (
          <>
            {coordinates && (
              <div className="mb-6">
                <LeafletMap
                  currentLocation={coordinates}
                  restaurants={restaurants}
                  selectedRestaurantId={selectedRestaurantId}
                  radiusKm={searchedRadiusKm}
                />
              </div>
            )}

            <div className="mb-4 flex min-w-0 items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black tracking-[0.12em] text-leaf">NEARBY RESTAURANTS</p>
                <h2 className="mt-1 break-words text-xl font-black tracking-tight sm:text-2xl">「{searchedQuery}」の検索結果</h2>
              </div>
              <div className="shrink-0 text-right">
                <p className="rounded-full bg-forest px-3 py-1.5 text-xs font-black text-white">おすすめ順</p>
                <p className="mt-1 text-xs font-bold text-ink/45">{restaurants.length}件</p>
              </div>
            </div>

            <div className="space-y-4">
              {restaurants.map((restaurant, index) => (
                <article
                  key={restaurant.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${restaurant.name}を地図で表示`}
                  onClick={() => setSelectedRestaurantId(restaurant.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedRestaurantId(restaurant.id);
                    }
                  }}
                  className={`result-card cursor-pointer rounded-[1.75rem] border bg-white p-5 shadow-[0_8px_30px_rgba(31,74,62,0.06)] transition active:scale-[0.99] ${selectedRestaurantId === restaurant.id ? "border-coral ring-4 ring-coral/10" : "border-forest/10 hover:border-leaf/40"}`}
                  style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`grid size-11 shrink-0 place-items-center rounded-xl text-sm font-black ${index < 3 ? "bg-forest text-white" : "bg-cream text-forest"}`}>{index + 1}</div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 text-[10px] font-black tracking-[0.1em] text-leaf">おすすめ {index + 1}番目</p>
                      <h3 className="break-words text-lg font-black leading-6 text-ink sm:text-xl">{restaurant.name}</h3>
                      <span className="mt-3 inline-flex rounded-full bg-[#fff1c9] px-3 py-1.5 text-xs font-black text-[#7a5410]">{restaurant.genre}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-forest/5 px-4 py-4">
                    <p className="text-xs font-black text-ink/45">現在地から</p>
                    <p className="mt-0.5 flex items-center gap-2 text-2xl font-black tracking-tight text-forest">
                      <Navigation className="size-5 text-coral" />
                      {distanceLabel(restaurant.distanceKm)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-start gap-2 rounded-2xl border border-forest/10 bg-cream/60 px-4 py-3.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-leaf" />
                    <p className="text-sm font-bold leading-6 text-ink/65">{restaurant.formattedAddress}</p>
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-coral px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-coral/20 transition hover:bg-[#e86749] active:scale-[0.99]"
                    >
                      Googleマップで開く
                      <ArrowUpRight className="size-4 shrink-0" />
                    </a>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-forest px-4 py-3 text-center text-sm font-black text-white shadow-lg shadow-forest/20 transition hover:bg-[#174b3e] active:scale-[0.99]"
                    >
                      <Navigation className="size-4 shrink-0" />
                      経路案内
                    </a>
                  </div>

                  <a
                    href={restaurant.osmUri}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="mt-3 flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-xs font-black text-leaf transition hover:bg-forest/5 active:bg-forest/10"
                  >
                    OpenStreetMapで確認
                    <ArrowUpRight className="size-3.5" />
                  </a>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
      </div>
　　) : (
        <HomeCookingPanel
          ingredients={ingredients}
          ingredientInput={ingredientInput}
          onIngredientInputChange={updateIngredientInput}
          onCommitIngredient={commitIngredientInput}
          onAddIngredients={addIngredients}
          removeIngredient={removeIngredient}
          clearIngredients={clearIngredients}
          recipes={homeRecipes}
          openRecipe={openRecipe}
          onToggleRecipe={(name) => setOpenRecipe((current) => current === name ? null : name)}
        />
　　)}

      {cookingMode === "eatOut" && (
        <footer className="mt-12 text-center text-[11px] font-bold leading-5 text-ink/35 lg:mt-10">店舗情報 © OpenStreetMap contributors<br />距離が近い順に表示しています</footer>
      )}

      {cookingMode === "eatOut" && (
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-forest/10 bg-cream/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(24,51,45,0.10)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto max-w-3xl sm:px-2">
          <button form="restaurant-search" type="submit" disabled={requestState === "loading" || locationLoading} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-coral text-lg font-black text-white shadow-lg shadow-coral/25 transition active:scale-[0.99] active:bg-[#e86749] disabled:cursor-wait disabled:opacity-70">
            {requestState === "loading" ? <LoaderCircle className="size-6 animate-spin" /> : <Search className="size-6" />}
            {requestState === "loading" ? "お店を検索中..." : "近くのお店を探す"}
          </button>
        </div>
      </div>
      )}
    </main>
  );
}

function DiagnosisPanel({
  mood,
  budget,
  company,
  results,
  onMoodChange,
  onBudgetChange,
  onCompanyChange,
  onSearch,
  searching,
}: {
  mood: DiagnosisMood | null;
  budget: DiagnosisBudget | null;
  company: DiagnosisCompany | null;
  results: string[];
  onMoodChange: (value: DiagnosisMood) => void;
  onBudgetChange: (value: DiagnosisBudget) => void;
  onCompanyChange: (value: DiagnosisCompany) => void;
  onSearch: () => void;
  searching: boolean;
}) {
  return (
    <section className="mt-4 rounded-[1.75rem] border-2 border-[#f1c96f] bg-[#fff9e9] p-4 shadow-card sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#ffd178] text-forest">
          <Sparkles className="size-5" />
        </div>
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[#9a6710]">今日何食べる診断</p>
          <h2 className="text-xl font-black text-ink">3問でおすすめを決定</h2>
        </div>
      </div>

      <DiagnosisQuestion
        number="Q1"
        title="今の気分は？"
        value={mood}
        options={[
          { value: "hearty", label: "ガッツリ" },
          { value: "light", label: "あっさり" },
          { value: "either", label: "どちらでも" },
        ]}
        onChange={onMoodChange}
      />
      <DiagnosisQuestion
        number="Q2"
        title="予算は？"
        value={budget}
        options={[
          { value: "under1000", label: "～1000円" },
          { value: "1000to2000", label: "1000～2000円" },
          { value: "any", label: "気にしない" },
        ]}
        onChange={onBudgetChange}
      />
      <DiagnosisQuestion
        number="Q3"
        title="今日は誰と？"
        value={company}
        options={[
          { value: "alone", label: "ひとり" },
          { value: "together", label: "誰かと" },
          { value: "drinks", label: "飲みたい" },
        ]}
        onChange={onCompanyChange}
      />

      {results.length > 0 && (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm" aria-live="polite">
          <p className="text-sm font-black text-[#9a6710]">今日のおすすめジャンル</p>
          <div className="mt-3 grid gap-2">
            {results.map((genre, index) => (
              <div key={genre} className="flex min-h-12 items-center gap-3 rounded-xl bg-cream px-3 py-2">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-black ${index === 0 ? "bg-coral text-white" : "bg-forest text-white"}`}>
                  {index + 1}
                </span>
                <span className="text-base font-black text-ink">{genre}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onSearch}
            disabled={searching}
            className="mt-4 flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl bg-coral px-5 py-4 text-lg font-black text-white shadow-lg shadow-coral/20 transition active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
          >
            {searching ? <LoaderCircle className="size-5 animate-spin" /> : <Search className="size-5" />}
            {searching ? "お店を検索中..." : "近くのお店を探す"}
          </button>
        </div>
      )}
    </section>
  );
}

function DiagnosisQuestion<T extends string>({
  number,
  title,
  options,
  value,
  onChange,
}: {
  number: string;
  title: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="text-coral">{number}</span>
        {title}
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-black transition active:scale-[0.98] ${value === option.value ? "border-forest bg-forest text-white shadow-md" : "border-forest/10 bg-white text-ink hover:border-leaf/40"}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function HomeCookingPanel({
  ingredients,
  ingredientInput,
  onIngredientInputChange,
  onCommitIngredient,
  onAddIngredients,
  removeIngredient,
  clearIngredients,
  recipes,
  openRecipe,
  onToggleRecipe,
}: {
  ingredients: string[];
  ingredientInput: string;
  onIngredientInputChange: (value: string) => void;
  onCommitIngredient: () => void;
  onAddIngredients: (ingredients: string[]) => void;
  removeIngredient: (ingredient: string) => void;
  clearIngredients: () => void;
  recipes: HomeCookingSuggestion[];
  openRecipe: string | null;
  onToggleRecipe: (name: string) => void;
}) {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start lg:gap-8">
      <section className="rounded-[2rem] bg-forest p-6 text-white shadow-card sm:p-8 lg:sticky lg:top-6">
        <div className="grid size-12 place-items-center rounded-2xl bg-white/10">
          <ChefHat className="size-6 text-[#ffd178]" />
        </div>
        <h1 className="mt-5 text-3xl font-black tracking-[-0.04em]">冷蔵庫から<br />今日のメニューを提案</h1>
        <p className="mt-3 text-sm font-bold leading-7 text-white/70">手元にある食材を入力すると、作りやすい順に3品おすすめします。</p>

        <div className="mt-7 flex items-center justify-between gap-3">
          <label htmlFor="home-ingredients" className="block text-sm font-black">冷蔵庫にある食材</label>
          {(ingredients.length > 0 || ingredientInput) && (
            <button type="button" onClick={clearIngredients} className="shrink-0 text-xs font-black text-[#ffd178] underline decoration-[#ffd178]/40 underline-offset-4 transition hover:text-white">
              全てクリア
            </button>
          )}
        </div>

        {ingredients.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label="入力済み食材">
            {ingredients.map((ingredient) => (
              <span key={ingredient} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-black text-forest">
                {ingredient}
                <button type="button" onClick={() => removeIngredient(ingredient)} aria-label={`${ingredient}を削除`} className="grid size-6 place-items-center rounded-full text-forest/50 transition hover:bg-forest/10 hover:text-forest">
                  <X className="size-4" />
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          id="home-ingredients"
          value={ingredientInput}
          onChange={(event) => onIngredientInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCommitIngredient();
            }
          }}
          onBlur={onCommitIngredient}
          placeholder="食材を入力して Enter"
          autoComplete="off"
          className="mt-3 h-14 w-full rounded-2xl border border-white/20 bg-white px-4 text-base font-bold text-ink outline-none transition placeholder:font-medium placeholder:text-ink/30 focus:border-[#ffd178] focus:ring-4 focus:ring-[#ffd178]/20"
        />
        <p className="mt-2 text-xs font-medium leading-5 text-white/55">Enter・読点・スペースで食材を追加できます。</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {["卵 ごはん 玉ねぎ", "豚肉 キャベツ", "豆腐 ネギ 豚肉"].map((example) => (
            <button key={example} type="button" onClick={() => onAddIngredients(example.split(" "))} className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20 active:scale-95">
              + {example.replaceAll(" ", "・")}
            </button>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-[2rem] border border-forest/10 bg-white/60 p-4 shadow-[0_24px_70px_rgba(31,74,62,0.08)] sm:p-6 lg:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-coral/10 text-coral"><Sparkles className="size-5" /></div>
          <div>
            <p className="text-xs font-black tracking-[0.12em] text-coral">HOME COOKING</p>
            <h2 className="text-xl font-black text-ink">おすすめメニュー</h2>
          </div>
        </div>

        {recipes.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-forest/20 px-6 py-12 text-center">
            <ChefHat className="mx-auto size-8 text-leaf/50" />
            <p className="mt-4 text-sm font-black text-ink">食材を入力するとレシピが表示されます</p>
            <p className="mt-1 text-xs leading-6 text-ink/45">ひとつだけでも大丈夫です。</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {recipes.map((recipe, index) => {
              const isOpen = openRecipe === recipe.name;

              return (
                <article key={recipe.name} className="rounded-[1.5rem] border border-forest/10 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 0 ? "bg-coral text-white" : "bg-cream text-forest"}`}>{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl font-black text-ink">{recipe.name}</h3>
                      <p className="mt-1 text-xs font-medium leading-5 text-ink/55">{recipe.reason}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1.5 text-xs font-black text-forest"><Clock3 className="size-3.5" />約{recipe.cookingTimeMinutes}分</span>
                    {recipe.availableIngredients.map((ingredient) => <span key={ingredient} className="rounded-full bg-[#edf7ef] px-3 py-1.5 text-xs font-bold text-[#28713f]">✓ {ingredient}</span>)}
                  </div>

                  <div className={`mt-4 rounded-2xl px-4 py-3 ${recipe.missingIngredients.length === 0 ? "bg-[#edf7ef]" : "bg-[#fff1e8]"}`}>
                    <p className={`text-xs font-black ${recipe.missingIngredients.length === 0 ? "text-[#28713f]" : "text-[#a34e28]"}`}>
                      {recipe.missingIngredients.length === 0 ? "不足食材なし" : `不足食材：${recipe.missingIngredients.join("・")}`}
                    </p>
                  </div>

                  <button type="button" aria-expanded={isOpen} onClick={() => onToggleRecipe(recipe.name)} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-black text-white transition hover:bg-leaf active:scale-[0.99]">
                    {isOpen ? "レシピを閉じる" : "レシピを見る"}
                    <ChevronRight className={`size-4 transition ${isOpen ? "rotate-90" : ""}`} />
                  </button>

                  {isOpen && (
                    <ol className="mt-4 space-y-3 border-t border-forest/10 pt-4">
                      {recipe.recipeSteps.map((step, stepIndex) => (
                        <li key={step} className="flex gap-3 text-sm font-medium leading-6 text-ink/70">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#fff1c9] text-xs font-black text-[#7a5410]">{stepIndex + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-4 text-sm font-bold leading-6 text-red-700">
      <AlertCircle className="mt-0.5 size-5 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function QuestionChips<T extends string>({
  number,
  title,
  options,
  value,
  onChange,
}: {
  number: string;
  title: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="mt-5">
      <legend className="flex items-center gap-2 text-sm font-black text-ink">
        <span className="grid size-6 place-items-center rounded-full bg-[#f1c96f] text-xs text-[#6a480b]">{number}</span>{title}
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)} className={`min-h-11 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95 ${value === option.value ? "border-forest bg-forest text-white" : "border-[#e6cf99] bg-white text-ink/65"}`}>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
