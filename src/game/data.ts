import type { DayEvent, ItemDef } from "./types";

export const SAVE_KEY = "bubble-mart-tycoon-v1";
export const DAY_LEN = 66; // seconds per day (leisurely clock — plenty of time per customer)
export const START_CASH = 120;
export const GOAL = 10000;
export const MAX_SLOTS = 16;
export const START_SLOTS = 4;
export const CARRY = 5; // units per manual restock click
export const PATIENCE_SEC = 34;
export const BASE_SPAWN = 0.42; // customers / sec (early days are quieter — see day ramp)
export const MAX_STAFF = 4;
export const DEBUG_FLOOR = 1_000_000; // sandbox cash floor
export const WAGE_BASE = 35; // 1st employee's daily wage
export const WAGE_STEP = 5;  // each additional employee costs +$5/day
/** daily wage of employee #k on the ladder: 1st $35, 2nd $40, 3rd $45… (cashiers & stockers share one ladder) */
export const wageOf = (k: number) => WAGE_BASE + WAGE_STEP * (k - 1);
/** daily wage your NEXT hire will work for, given current total headcount */
export const nextWage = (totalStaff: number) => wageOf(totalStaff + 1);

export const ITEMS: ItemDef[] = [
  { id: "soda",     name: "Fizz Cola",      short: "FIZZ",  grad: ["#ff7b7b", "#e5263a"], base: 0.48, retail: 1.75, unlockCost: 0,    reqLevel: 1, tag: "Drinks" },
  { id: "chips",    name: "Crunch Chips",   short: "CRUNCH",grad: ["#ffbe63", "#f57f17"], base: 0.64, retail: 2.25, unlockCost: 0,    reqLevel: 1, tag: "Snacks" },
  { id: "bread",    name: "Bakery Bread",   short: "BAKE",  grad: ["#ffd9a0", "#d9932f"], base: 0.72, retail: 2.25, unlockCost: 0,    reqLevel: 1, tag: "Bakery" },
  { id: "milk",     name: "Moo Milk",       short: "MOO",   grad: ["#bfe8ff", "#4db8ff"], base: 0.8,  retail: 2.75, unlockCost: 120,  reqLevel: 2, tag: "Dairy" },
  { id: "candy",    name: "Sugar Bombs",    short: "SUGAR", grad: ["#ff9ecb", "#f0438c"], base: 0.4,  retail: 1.75, unlockCost: 220,  reqLevel: 2, tag: "Sweets" },
  { id: "coffee",   name: "Rocket Coffee",  short: "ROCKET",grad: ["#c98a4b", "#6f4218"], base: 1.75, retail: 5.0,  unlockCost: 440,  reqLevel: 3, tag: "Drinks" },
  { id: "soap",     name: "Bubble Soap",    short: "BUBBLE",grad: ["#7fe3d2", "#12a18d"], base: 1.1,  retail: 3.25, unlockCost: 650,  reqLevel: 3, tag: "Home" },
  { id: "battery",  name: "Volt Cells",     short: "VOLT",  grad: ["#ff922b", "#e8590c"], base: 2.25, retail: 6.5,  unlockCost: 950,  reqLevel: 4, tag: "Tech" },
  { id: "icecream", name: "Chomp Bites",    short: "CHOMP", grad: ["#e5383b", "#6a040f"], base: 1.45, retail: 4.25, unlockCost: 1350, reqLevel: 4, tag: "Frozen" },
  { id: "magazine", name: "Glossy Mags",    short: "GLOSS", grad: ["#c39bff", "#7d4dff"], base: 1.3,  retail: 3.75, unlockCost: 1750, reqLevel: 5, tag: "Print" },
  { id: "juice",    name: "Zing Juice",     short: "ZING",  grad: ["#7ade6a", "#2f9e44"], base: 0.55, retail: 1.95, unlockCost: 150,  reqLevel: 2, tag: "Drinks" },
  { id: "noodles",  name: "Slurp Noodles",  short: "SLURP", grad: ["#f4a261", "#e76f51"], base: 0.9,  retail: 2.6,  unlockCost: 280,  reqLevel: 2, tag: "Pantry" },
  { id: "toothpaste", name: "Mint Paste",   short: "MINT",  grad: ["#80ffdb", "#48bfe3"], base: 1.15, retail: 3.1,  unlockCost: 420,  reqLevel: 3, tag: "Home" },
  { id: "petfood",  name: "Paw Treats",     short: "PAW",   grad: ["#d4a373", "#a98467"], base: 1.55, retail: 4.0,  unlockCost: 760,  reqLevel: 4, tag: "Pets" },
  { id: "shampoo",  name: "Foam Shampoo",   short: "FOAM",  grad: ["#a8dadc", "#457b9d"], base: 1.9,  retail: 4.9,  unlockCost: 1100, reqLevel: 4, tag: "Home" },
  { id: "energy",   name: "Turbo Energy",   short: "TURBO", grad: ["#ffe45e", "#e8a800"], base: 1.45, retail: 4.4,  unlockCost: 1550, reqLevel: 5, tag: "Drinks" },
];

export const itemById = (id: string): ItemDef =>
  ITEMS.find((i) => i.id === id) as ItemDef;

export const EVENTS: DayEvent[] = [
  { id: "heat",    emoji: "🌞", name: "Heatwave!",        desc: "Everyone wants cold fizzy things today.",   traffic: 1.15, demand: { soda: 2.1, icecream: 2.3 }, bigCarts: false },
  { id: "rain",    emoji: "🌧️", name: "Rainy Day",        desc: "Fewer folks out shopping… cozy till vibes.",traffic: 0.7,  demand: { bread: 1.4 },                bigCarts: false },
  { id: "payday",  emoji: "💰", name: "Payday!",          desc: "Wallets are fat — carts are bigger.",       traffic: 1.35, demand: {},                            bigCarts: true },
  { id: "marathon",emoji: "🏃", name: "Marathon Weekend", desc: "Runners crave coffee and sugar.",           traffic: 1.1,  demand: { coffee: 2.4, candy: 1.6 },   bigCarts: false },
  { id: "health",  emoji: "🥗", name: "Health Kick",      desc: "Town went gym-mode. Soap up, snack down.",  traffic: 1.0,  demand: { soap: 2.0, chips: 0.5, candy: 0.5 }, bigCarts: false },
  { id: "tourbus", emoji: "🚌", name: "Tourist Bus",      desc: "Visitors grab batteries and magazines.",    traffic: 1.25, demand: { battery: 2.2, magazine: 2.2 }, bigCarts: false },
];

export const NAMES = [
  "Betty", "Old Man Jenkins", "Zoe", "Marcus", "Priya", "Gus", "Lola", "Big Dave",
  "Mimi", "Coach Ray", "Tilly", "Hank", "Nia", "Walter", "Poppy", "DJ Bleu",
  "Rosa", "Ezra", "Duchess", "Sammy", "Vera", "Kip", "Aunt Mae", "Bruno",
];

/* ---------- cost curves ---------- */
export const slotCost = (owned: number) =>
  Math.round(180 * Math.pow(1.42, owned - START_SLOTS));

export const shelfCost = (count: number) =>
  Math.round(70 * Math.pow(1.3, count));

export const hireCost = (kind: "cashier" | "stocker", n: number) =>
  Math.round(kind === "cashier" ? 150 * Math.pow(1.5, n) : 80 * Math.pow(1.35, n));

/** store level required before a staff type can be hired */
export const STAFF_UNLOCK: Record<"cashier" | "stocker", number> = { cashier: 4, stocker: 2 };

export const upgradeCost = (kind: "speed" | "capacity" | "marketing" | "register", lvl: number) => {
  switch (kind) {
    case "speed":     return Math.round(187 * Math.pow(1.7, lvl));
    case "capacity":  return Math.round(68 * Math.pow(1.3, lvl));
    case "marketing": return Math.round(221 * Math.pow(1.75, lvl));
    case "register":  return Math.round(272 * Math.pow(1.8, lvl));
  }
};

export const upgradeMax = (kind: "speed" | "capacity" | "marketing" | "register") =>
  kind === "register" ? 3 : kind === "speed" ? 5 : kind === "capacity" ? 10 : 5;

/* ---------- derived formulas ---------- */
export const shelfCapacity = (capLvl: number) => 10 + 5 * capLvl;
export const queueCap = (registers: number) => 5 + 3 * (registers - 1);
export const autoSeconds = (speedLvl: number) => 4.0 / (1 + 0.3 * speedLvl);
export const dailyRent = (slots: number) => 12 + slots * 2;
/** total daily payroll — sum of the ladder: 1 staff $35, 2 staff $75, 3 staff $120, 4 staff $170 */
export const dailyWages = (cashiers: number, stockers: number) => {
  const n = cashiers + stockers;
  let total = 0;
  for (let k = 1; k <= n; k++) total += wageOf(k);
  return total;
};

/** demand 0.25..1.35 — cheaper than suggested retail boosts demand */
export const demandFactor = (price: number, retail: number) =>
  clamp(2 - price / retail, 0.25, 1.35);

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/* pricing lives on a strict $0.25 grid */
export const MIN_PRICE = 0.5;
export const snap25 = (n: number) => Math.round(n * 4) / 4;
/** highest allowed shelf price, snapped onto the quarter grid */
export const maxPrice = (def: ItemDef) => Math.floor(def.retail * 2.4 * 4) / 4;

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt0 = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

/** effective wholesale price today (flash deal = 40% off) */
export const effPrice = (price: number, flash: boolean) =>
  round2(flash ? price * 0.6 : price);

export const CHANGE_DENOMS = [20, 10, 5, 2, 1, 0.5, 0.25];

export const levelFromXp = (xp: number) => {
  let lvl = 1;
  let need = 0;
  while (xp >= need + lvl * 130) {
    need += lvl * 130;
    lvl++;
  }
  return { level: lvl, into: xp - need, need: lvl * 130 };
};
