export type Mood = "hearty" | "light" | "drinks" | "sweet" | "unsure";
export type Budget = "low" | "normal" | "treat";
export type DistancePreference = "near" | "walk";

export type RecommendationAnswers = {
  mood: Mood;
  budget: Budget;
  distance: DistancePreference;
};

export type FoodSuggestion = {
  name: string;
  reason: string;
};

type FoodCandidate = {
  name: string;
  moods: Mood[];
  budgets: Budget[];
  distances: DistancePreference[];
  flavor: string;
};

const candidates: FoodCandidate[] = [
  { name: "焼肉", moods: ["hearty", "drinks"], budgets: ["normal", "treat"], distances: ["walk"], flavor: "しっかり食べて元気を出したい日にぴったり" },
  { name: "ラーメン", moods: ["hearty", "unsure"], budgets: ["low", "normal"], distances: ["near", "walk"], flavor: "気軽に満足感を得やすい定番" },
  { name: "寿司", moods: ["light", "drinks", "unsure"], budgets: ["normal", "treat"], distances: ["walk"], flavor: "軽さと特別感をどちらも楽しめる" },
  { name: "そば", moods: ["light", "unsure"], budgets: ["low", "normal"], distances: ["near"], flavor: "あっさり食べられて胃にもやさしい" },
  { name: "カレー", moods: ["hearty", "unsure"], budgets: ["low", "normal"], distances: ["near", "walk"], flavor: "迷ったときにも選びやすく満足感がある" },
  { name: "中華料理", moods: ["hearty", "drinks"], budgets: ["normal", "treat"], distances: ["near", "walk"], flavor: "シェアもしやすく味の選択肢が豊富" },
  { name: "居酒屋", moods: ["drinks", "unsure"], budgets: ["normal", "treat"], distances: ["near"], flavor: "飲みながら少しずつ色々選べる" },
  { name: "イタリアン", moods: ["drinks", "unsure"], budgets: ["normal", "treat"], distances: ["walk"], flavor: "料理もお酒もゆっくり楽しめる" },
  { name: "カフェ", moods: ["light", "sweet", "unsure"], budgets: ["low", "normal"], distances: ["near"], flavor: "軽食から甘いものまで気分で選べる" },
  { name: "スイーツ", moods: ["sweet"], budgets: ["low", "normal", "treat"], distances: ["near", "walk"], flavor: "甘いもので気分を切り替えたい日におすすめ" },
  { name: "ハンバーガー", moods: ["hearty"], budgets: ["low", "normal"], distances: ["near"], flavor: "手軽でボリュームのある食事に向いている" },
  { name: "海鮮", moods: ["light", "drinks"], budgets: ["normal", "treat"], distances: ["walk"], flavor: "さっぱりした味とちょっとした贅沢感がある" },
];

export function recommendFoods(answers: RecommendationAnswers): FoodSuggestion[] {
  return candidates
    .map((candidate, index) => {
      const moodScore = candidate.moods.includes(answers.mood) ? 5 : answers.mood === "unsure" ? 2 : 0;
      const budgetScore = candidate.budgets.includes(answers.budget) ? 3 : 0;
      const distanceScore = candidate.distances.includes(answers.distance) ? 2 : 0;
      return { candidate, score: moodScore + budgetScore + distanceScore - index * 0.001 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ candidate }) => ({
      name: candidate.name,
      reason: `${candidate.flavor}から。今の予算と距離感にも合わせやすそうです。`,
    }));
}

type YesterdayFoodCategory =
  | "meat"
  | "noodles"
  | "curry"
  | "seafood"
  | "drinks"
  | "cafe"
  | "japanese"
  | "chinese"
  | "western"
  | "unknown";

const yesterdaySuggestions: Record<YesterdayFoodCategory, FoodSuggestion[]> = {
  meat: [
    { name: "寿司", reason: "昨日がっつり肉なら、今日は少し軽めの魚系で気分転換。" },
    { name: "そば", reason: "肉料理の翌日は、あっさりした麺で胃を休めるのもおすすめ。" },
    { name: "カレー", reason: "肉料理とは違うスパイスの満足感で気分を変えられます。" },
  ],
  noodles: [
    { name: "定食", reason: "昨日が麺なら、今日はごはんとおかずでバランスよく。" },
    { name: "寿司", reason: "麺とは違う魚とごはんで、さっぱり楽しめます。" },
    { name: "カフェごはん", reason: "軽めのプレート料理で昨日とは違う気分に。" },
  ],
  curry: [
    { name: "うどん", reason: "昨日がスパイシーなら、今日はやさしい味の麺料理もおすすめ。" },
    { name: "焼肉", reason: "スパイス系とは違う香ばしい肉料理で満足感を変えられます。" },
    { name: "寿司", reason: "カレーの翌日は、さっぱりした魚系で口当たりを変えてみましょう。" },
  ],
  seafood: [
    { name: "焼肉", reason: "昨日が魚系なら、今日は香ばしい肉料理で気分転換。" },
    { name: "カレー", reason: "魚料理とは違うスパイスの刺激で印象を変えられます。" },
    { name: "中華料理", reason: "炒め物や点心など、魚系とは違う味と食感を楽しめます。" },
  ],
  drinks: [
    { name: "そば", reason: "昨日がお酒中心なら、今日はあっさりした食事で整えましょう。" },
    { name: "定食", reason: "ごはんとおかずが揃った定食で落ち着いた食事に。" },
    { name: "カフェごはん", reason: "軽めのプレート料理で、昨日とは違うゆったりした食事に。" },
  ],
  cafe: [
    { name: "焼肉", reason: "昨日が軽めなら、今日はしっかりした肉料理もおすすめ。" },
    { name: "中華料理", reason: "カフェごはんとは違う熱々で味の濃い料理を楽しめます。" },
    { name: "寿司", reason: "甘いものや軽食の翌日は、魚とごはんで食事らしさを。" },
  ],
  japanese: [
    { name: "イタリアン", reason: "昨日が和食なら、今日は洋風料理で変化を。" },
    { name: "カレー", reason: "和食とは違うスパイスの香りで気分を切り替えられます。" },
    { name: "中華料理", reason: "炒め物や点心など、和食とは違う味付けを楽しめます。" },
  ],
  chinese: [
    { name: "そば", reason: "昨日が中華なら、今日はあっさりした料理がおすすめ。" },
    { name: "寿司", reason: "油を使った料理の翌日は、さっぱりした魚系で気分転換。" },
    { name: "カフェごはん", reason: "軽めのプレート料理なら穏やかな食事になります。" },
  ],
  western: [
    { name: "和食", reason: "昨日が洋食なら、今日はだしや醤油の和食で味を変えましょう。" },
    { name: "そば", reason: "洋食の翌日は、あっさりした麺料理もおすすめ。" },
    { name: "寿司", reason: "チーズやソース系とは違う、さっぱりした魚料理を楽しめます。" },
  ],
  unknown: [
    { name: "寿司", reason: "さっぱりした魚系は、昨日とは違う食事を選びたい日におすすめ。" },
    { name: "カレー", reason: "スパイスの香りで気分を切り替えやすい定番料理です。" },
    { name: "そば", reason: "軽めに食べたい日にも選びやすい、あっさりした料理です。" },
  ],
};

function detectYesterdayFoodCategory(food: string): YesterdayFoodCategory {
  const value = food.toLowerCase().replace(/[ 　・･_-]/g, "");

  if (/(焼肉|やきにく|ステーキ|ハンバーグ|しゃぶしゃぶ|すき焼き|焼き鳥|とんかつ|唐揚げ|肉)/.test(value)) return "meat";
  if (/(ラーメン|らーめん|中華そば|つけ麺|うどん|そば|蕎麦|パスタ|スパゲッティ|麺)/.test(value)) return "noodles";
  if (/(カレー|カリー|スープカレー|インドカレー)/.test(value)) return "curry";
  if (/(寿司|すし|鮨|刺身|海鮮|魚|牡蠣|うなぎ|鰻)/.test(value)) return "seafood";
  if (/(居酒屋|バー|バル|焼酎|ビール|ワイン|飲み)/.test(value)) return "drinks";
  if (/(カフェ|喫茶店|コーヒー|スイーツ|ケーキ|パンケーキ)/.test(value)) return "cafe";
  if (/(中華|麻婆豆腐|餃子|チャーハン|四川|中国料理)/.test(value)) return "chinese";
  if (/(イタリアン|フレンチ|ピザ|オムライス|洋食|グラタン)/.test(value)) return "western";
  if (/(和食|定食|天ぷら|丼|おにぎり|おでん)/.test(value)) return "japanese";

  return "unknown";
}

export function recommendFromYesterday(yesterdayFood: string): FoodSuggestion[] {
  const trimmedFood = yesterdayFood.trim();
  if (!trimmedFood) return [];

  const category = detectYesterdayFoodCategory(trimmedFood);
  return yesterdaySuggestions[category];
}

type RecentMealPattern =
  | "hearty"
  | "rich"
  | "light"
  | "balanced";

const recentMealSuggestions: Record<RecentMealPattern, FoodSuggestion[]> = {
  hearty: [
    { name: "寿司", reason: "最近がっつりした食事が多いので、今日は軽めの魚系で気分転換。" },
    { name: "そば", reason: "肉や麺が続いたときは、あっさりしたそばで胃を休めるのもおすすめ。" },
    { name: "和食", reason: "だしを使った和食なら、最近とは違う落ち着いた食事にできます。" },
  ],
  rich: [
    { name: "そば", reason: "最近は味の濃い料理が多いので、今日はあっさりしたそばがおすすめ。" },
    { name: "寿司", reason: "スパイスや油を使った料理が続いたときは、魚系でさっぱり気分転換。" },
    { name: "カフェごはん", reason: "軽めのプレート料理なら、最近とは違う穏やかな食事を楽しめます。" },
  ],
  light: [
    { name: "焼肉", reason: "最近は魚や和食など軽めの料理が多いので、今日はしっかり肉料理もあり。" },
    { name: "カレー", reason: "さっぱり系が続いたときは、スパイスの効いた料理で変化を付けられます。" },
    { name: "中華料理", reason: "炒め物や点心など、最近とは違う味と食感を楽しめます。" },
  ],
  balanced: [
    { name: "寿司", reason: "最近の食事に大きな偏りがないので、今日はさっぱりした魚系がおすすめ。" },
    { name: "カレー", reason: "気分を変えやすく、満足感も得られる定番料理です。" },
    { name: "そば", reason: "軽めにしたい日にも選びやすい、あっさりした料理です。" },
  ],
};

function detectRecentMealPattern(categories: YesterdayFoodCategory[]): RecentMealPattern {
  const count = (target: YesterdayFoodCategory) =>
    categories.filter((category) => category === target).length;

  const scores = {
    hearty: count("meat") * 2 + count("noodles") + count("curry"),
    rich: count("curry") * 2 + count("chinese") * 2 + count("noodles") + count("western") + count("drinks"),
    light: count("seafood") * 2 + count("japanese") * 2 + count("cafe"),
  };

  const sortedPatterns = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [highestPattern, highestScore] = sortedPatterns[0] as [RecentMealPattern, number];

  return highestScore >= 2 ? highestPattern : "balanced";
}

export function recommendFromRecentMeals(meals: string[]): FoodSuggestion[] {
  const filledMeals = meals.map((meal) => meal.trim()).filter(Boolean);

  if (filledMeals.length === 0) return [];

  const categories = filledMeals
    .map(detectYesterdayFoodCategory)
    .filter((category) => category !== "unknown");

  if (categories.length === 0) return recentMealSuggestions.balanced;

  const pattern = detectRecentMealPattern(categories);
  return recentMealSuggestions[pattern];
}

export type CookingMode = "eatOut" | "cookAtHome";

type IngredientRule = {
  requiredIngredients: string[][];
  suggestions: FoodSuggestion[];
};

const ingredientRules: IngredientRule[] = [
  {
    requiredIngredients: [["卵", "たまご"], ["米", "ごはん", "白米"]],
    suggestions: [
      { name: "オムライス", reason: "卵とごはんを使って、満足感のある一皿にできます。" },
      { name: "卵チャーハン", reason: "卵とごはんを炒めるだけで、手早く作れます。" },
      { name: "親子丼", reason: "卵とごはんを活かした、温かい丼ものがおすすめです。" },
    ],
  },
  {
    requiredIngredients: [["キャベツ"], ["豚肉", "豚", "豚バラ", "豚こま"]],
    suggestions: [
      { name: "回鍋肉", reason: "キャベツと豚肉を、味噌ベースの濃いめの味付けで楽しめます。" },
      { name: "豚キャベツ炒め", reason: "豚肉とキャベツを炒めるだけで、手軽なおかずになります。" },
      { name: "お好み焼き", reason: "キャベツと豚肉をたっぷり使える、食べ応えのあるメニューです。" },
    ],
  },
  {
    requiredIngredients: [["鶏肉", "鶏", "鶏もも", "鶏むね", "ささみ"], ["玉ねぎ", "たまねぎ", "玉葱"]],
    suggestions: [
      { name: "親子丼", reason: "鶏肉と玉ねぎを卵でとじれば、定番の丼ものになります。" },
      { name: "チキンソテー", reason: "鶏肉を香ばしく焼き、玉ねぎを添えて楽しめます。" },
      { name: "鶏の照り焼き", reason: "鶏肉と玉ねぎを甘辛く仕上げる、ごはんに合うおかずです。" },
    ],
  },
  {
    requiredIngredients: [["豆腐"], ["ネギ", "ねぎ", "長ねぎ", "青ねぎ", "葱"]],
    suggestions: [
      { name: "麻婆豆腐", reason: "豆腐とネギを使って、しっかり味の一品にできます。" },
      { name: "豆腐チャンプルー", reason: "豆腐とネギを炒めて、食べ応えのあるおかずにできます。" },
      { name: "冷奴", reason: "豆腐にネギを添えるだけで、すぐに食べられる一品になります。" },
    ],
  },
  {
    requiredIngredients: [["米", "ごはん", "白米"], ["鮭", "しゃけ", "サーモン"]],
    suggestions: [
      { name: "鮭定食", reason: "鮭を焼いてごはんと合わせれば、バランスのよい定食になります。" },
      { name: "鮭チャーハン", reason: "鮭とごはんを炒めて、香ばしい一皿にできます。" },
      { name: "鮭茶漬け", reason: "鮭とごはんを使って、さらっと食べられるメニューにできます。" },
    ],
  },
];

const fallbackHomeCookingSuggestions: FoodSuggestion[] = [
  { name: "野菜炒め", reason: "手元の野菜を組み合わせて、手軽なおかずにできます。" },
  { name: "チャーハン", reason: "ごはんと余っている食材を一緒に炒めて活用できます。" },
  { name: "具だくさん味噌汁", reason: "手元の食材を少しずつ使えて、温かい一品になります。" },
];

function parseIngredients(ingredientsText: string): string[] {
  return ingredientsText
    .toLocaleLowerCase("ja")
    .split(/[,、，\s　]+/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

function matchesIngredientGroup(
  ingredients: string[],
  aliases: string[],
): boolean {
  return ingredients.some((ingredient) =>
    aliases.some((alias) => ingredient.includes(alias.toLocaleLowerCase("ja"))),
  );
}

export function recommendFromIngredients(
  ingredientsText: string,
): FoodSuggestion[] {
  const ingredients = parseIngredients(ingredientsText);

  if (ingredients.length === 0) {
    return [];
  }

  const matchedRule = ingredientRules.find((rule) =>
    rule.requiredIngredients.every((aliases) =>
      matchesIngredientGroup(ingredients, aliases),
    ),
  );

  return matchedRule?.suggestions ?? fallbackHomeCookingSuggestions;
}

export type HomeCookingSuggestion = {
  name: string;
  reason: string;
  availableIngredients: string[];
  missingIngredients: string[];
  cookingTimeMinutes: number;
  recipeSteps: string[];
};

type HomeRecipeRule = {
  name: string;
  ingredients: string[];
  cookingTimeMinutes: number;
  recipeSteps: string[];
};

const homeIngredientAliases: Record<string, string[]> = {
  卵: ["卵", "たまご", "玉子"],
  ごはん: ["ごはん", "米", "白米", "冷やご飯"],
  キャベツ: ["キャベツ"],
  豚肉: ["豚肉", "豚", "豚バラ", "豚こま", "豚ロース"],
  鶏肉: ["鶏肉", "鶏", "鶏もも", "鶏むね", "ささみ"],
  玉ねぎ: ["玉ねぎ", "たまねぎ", "玉葱"],
  豆腐: ["豆腐", "木綿豆腐", "絹豆腐"],
  ネギ: ["ネギ", "ねぎ", "長ねぎ", "青ねぎ", "葱"],
  鮭: ["鮭", "しゃけ", "サーモン"],
  チーズ: ["チーズ", "とろけるチーズ", "ピザ用チーズ"],
  トマト: ["トマト", "ミニトマト"],
  にんじん: ["にんじん", "人参"],
  じゃがいも: ["じゃがいも", "ジャガイモ", "ポテト"],
  きのこ: ["きのこ", "しめじ", "えのき", "舞茸", "しいたけ"],
  麺: ["麺", "中華麺", "うどん", "焼きそば"],
};

const homeRecipeRules: HomeRecipeRule[] = [
  {
    name: "オムライス",
    ingredients: ["卵", "ごはん", "玉ねぎ"],
    cookingTimeMinutes: 20,
    recipeSteps: [
      "玉ねぎを細かく切って炒めます。",
      "ごはんを加え、ケチャップなどで味を整えます。",
      "溶き卵を焼き、ごはんを包んで完成です。",
    ],
  },
  {
    name: "卵チャーハン",
    ingredients: ["卵", "ごはん", "ネギ"],
    cookingTimeMinutes: 15,
    recipeSteps: [
      "卵を溶き、フライパンで半熟になるまで炒めます。",
      "ごはんとネギを加えて強火で炒めます。",
      "塩、こしょう、醤油などで味を整えます。",
    ],
  },
  {
    name: "親子丼",
    ingredients: ["鶏肉", "玉ねぎ", "卵", "ごはん"],
    cookingTimeMinutes: 20,
    recipeSteps: [
      "鶏肉と玉ねぎを食べやすい大きさに切ります。",
      "醤油、みりん、だしで鶏肉と玉ねぎを煮ます。",
      "溶き卵を加え、半熟になったらごはんにのせます。",
    ],
  },
  {
    name: "回鍋肉",
    ingredients: ["豚肉", "キャベツ"],
    cookingTimeMinutes: 20,
    recipeSteps: [
      "豚肉とキャベツを食べやすい大きさに切ります。",
      "豚肉を炒め、火が通ったらキャベツを加えます。",
      "味噌、醤油、砂糖などで味を整えます。",
    ],
  },
  {
    name: "豚キャベツ炒め",
    ingredients: ["豚肉", "キャベツ"],
    cookingTimeMinutes: 15,
    recipeSteps: [
      "豚肉とキャベツを食べやすい大きさに切ります。",
      "豚肉を炒めてからキャベツを加えます。",
      "塩、こしょう、醤油などで味を整えます。",
    ],
  },
  {
    name: "お好み焼き",
    ingredients: ["キャベツ", "豚肉", "卵"],
    cookingTimeMinutes: 25,
    recipeSteps: [
      "キャベツを細かく切ります。",
      "キャベツ、卵、小麦粉、水を混ぜます。",
      "豚肉をのせて両面を焼き、ソースをかけます。",
    ],
  },
  {
    name: "麻婆豆腐",
    ingredients: ["豆腐", "ネギ", "豚肉"],
    cookingTimeMinutes: 20,
    recipeSteps: [
      "豆腐とネギを食べやすい大きさに切ります。",
      "豚肉を炒め、味噌や豆板醤などで味付けします。",
      "豆腐を加えて軽く煮込み、ネギを加えます。",
    ],
  },
  {
    name: "鮭チャーハン",
    ingredients: ["鮭", "ごはん", "卵"],
    cookingTimeMinutes: 20,
    recipeSteps: [
      "鮭を焼き、骨を取り除いてほぐします。",
      "卵とごはんをフライパンで炒めます。",
      "鮭を加え、塩や醤油で味を整えます。",
    ],
  },
  {
    name: "チーズオムレツ",
    ingredients: ["卵", "チーズ"],
    cookingTimeMinutes: 10,
    recipeSteps: [
      "卵を溶き、塩とこしょうを加えます。",
      "フライパンへ卵を流し、チーズをのせます。",
      "卵を折りたたみ、チーズが溶けたら完成です。",
    ],
  },
  {
    name: "具だくさん味噌汁",
    ingredients: ["豆腐", "玉ねぎ", "にんじん", "きのこ"],
    cookingTimeMinutes: 20,
    recipeSteps: [
      "食材を食べやすい大きさに切ります。",
      "鍋にだしと食材を入れて、柔らかくなるまで煮ます。",
      "火を弱めて味噌を溶き入れます。",
    ],
  },
];

function normalizeHomeIngredient(value: string) {
  return value.toLocaleLowerCase("ja").replace(/[ 　・･_-]/g, "");
}

function hasHomeIngredient(
  enteredIngredients: string[],
  requiredIngredient: string,
) {
  const aliases = homeIngredientAliases[requiredIngredient] ?? [requiredIngredient];

  return enteredIngredients.some((enteredIngredient) =>
    aliases.some((alias) => {
      const normalizedAlias = normalizeHomeIngredient(alias);

      return (
        enteredIngredient.includes(normalizedAlias) ||
        normalizedAlias.includes(enteredIngredient)
      );
    }),
  );
}

export function recommendHomeRecipes(
  ingredientsText: string,
): HomeCookingSuggestion[] {
  const enteredIngredients = ingredientsText
    .split(/[,、，\s　]+/)
    .map((ingredient) => normalizeHomeIngredient(ingredient))
    .filter(Boolean);

  if (enteredIngredients.length === 0) {
    return [];
  }

  return homeRecipeRules
    .map((recipe) => {
      const availableIngredients = recipe.ingredients.filter((ingredient) =>
        hasHomeIngredient(enteredIngredients, ingredient),
      );

      const missingIngredients = recipe.ingredients.filter(
        (ingredient) => !hasHomeIngredient(enteredIngredients, ingredient),
      );

      const availableCount = availableIngredients.length;
      const missingCount = missingIngredients.length;
      const score = availableCount * 10 - missingCount * 15;

      const reason =
        missingCount === 0
          ? "冷蔵庫にある食材だけで作れそうです。"
          : `${availableCount}個の食材を活用でき、不足は${missingCount}個です。`;

      return {
        name: recipe.name,
        reason,
        availableIngredients,
        missingIngredients,
        cookingTimeMinutes: recipe.cookingTimeMinutes,
        recipeSteps: recipe.recipeSteps,
        score,
      };
    })
    .sort((a, b) => {
      if (a.missingIngredients.length !== b.missingIngredients.length) {
        return a.missingIngredients.length - b.missingIngredients.length;
      }

      if (a.availableIngredients.length !== b.availableIngredients.length) {
        return b.availableIngredients.length - a.availableIngredients.length;
      }

      return b.score - a.score;
    })
    .slice(0, 3)
    .map(({ score: _score, ...suggestion }) => suggestion);
}
