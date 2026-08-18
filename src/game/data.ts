import type { DayEvent, ItemDef } from "./types";

/* ==================== Game Constants ==================== */

/** localStorage key for save game data */
export const SAVE_KEY = "bubble-mart-tycoon-v1";

/** Length of a game day in seconds */
export const DAY_LEN = 66;

/** Starting cash for a new game */
export const START_CASH = 120;

/** Cash goal to win the game */
export const GOAL = 10000;

/** Maximum number of floor slots available */
export const MAX_SLOTS = 16;

/** Starting number of floor slots */
export const START_SLOTS = 4;

/** Units carried per manual restock click - increases with capacity upgrades */
export const CARRY = 5;

/** Manual restock capacity by upgrade tier: base=5, tier1=10, tier2=25 */
export const MANUAL_CARRY_TIERS = [5, 10, 25];

/** Seconds until a queued customer loses all patience */
export const PATIENCE_SEC = 34;

/** Base customer spawn rate (customers/second), modified by day progression and events */
export const BASE_SPAWN = 0.42;

/** Maximum staff members per type (cashier/stocker) */
export const MAX_STAFF = 4;

/** Debug mode cash floor - when enabled, cash never drops below this */
export const DEBUG_FLOOR = 1_000_000;

/* ==================== Wage System ==================== */

/** Base daily wage for the first employee */
export const WAGE_BASE = 35;

/** Wage increase per additional employee on the shared ladder */
export const WAGE_STEP = 5;

/**
 * Calculate daily wage for employee at position k on the wage ladder
 * Employees share a single ladder regardless of type (cashier/stocker)
 * Sequence: 1st=$35, 2nd=$40, 3rd=$45, etc.
 */
export const wageOf = (k: number) => WAGE_BASE + WAGE_STEP * (k - 1);

/**
 * Calculate the wage that the next hired employee will require
 * @param totalStaff - Current total number of employees
 */
export const nextWage = (totalStaff: number) => wageOf(totalStaff + 1);

/* ==================== Product Catalog ==================== */

/** All available products in the game with their properties */
export const ITEMS: ItemDef[] = [
  // Level 1 - Starter items (no unlock cost)
  { id: "soda",     name: "Fizz Cola",      short: "FIZZ",  grad: ["#ff7b7b", "#e5263a"], base: 0.48, retail: 2.25, unlockCost: 0,    reqLevel: 1, tag: "Drinks" },
  { id: "chips",    name: "Crunch Chips",   short: "CRUNCH",grad: ["#ffbe63", "#f57f17"], base: 0.64, retail: 2.75, unlockCost: 0,    reqLevel: 1, tag: "Snacks" },
  { id: "bread",    name: "Bakery Bread",   short: "BAKE",  grad: ["#ffd9a0", "#d9932f"], base: 0.72, retail: 2.75, unlockCost: 0,    reqLevel: 1, tag: "Bakery" },
  // Level 2 items
  { id: "milk",     name: "Moo Milk",       short: "MOO",   grad: ["#bfe8ff", "#4db8ff"], base: 0.8,  retail: 3.25, unlockCost: 120,  reqLevel: 2, tag: "Dairy" },
  { id: "candy",    name: "Sugar Bombs",    short: "SUGAR", grad: ["#ff9ecb", "#f0438c"], base: 0.4,  retail: 2.25, unlockCost: 220,  reqLevel: 2, tag: "Sweets" },
  { id: "juice",    name: "Zing Juice",     short: "ZING",  grad: ["#7ade6a", "#2f9e44"], base: 0.55, retail: 2.45, unlockCost: 150,  reqLevel: 2, tag: "Drinks" },
  { id: "noodles",  name: "Slurp Noodles",  short: "SLURP", grad: ["#f4a261", "#e76f51"], base: 0.9,  retail: 3.1,  unlockCost: 280,  reqLevel: 2, tag: "Pantry" },
  // Level 3 items
  { id: "coffee",   name: "Rocket Coffee",  short: "ROCKET",grad: ["#c98a4b", "#6f4218"], base: 1.75, retail: 5.5,  unlockCost: 440,  reqLevel: 3, tag: "Drinks" },
  { id: "soap",     name: "Bubble Soap",    short: "BUBBLE",grad: ["#7fe3d2", "#12a18d"], base: 1.1,  retail: 3.75, unlockCost: 650,  reqLevel: 3, tag: "Home" },
  { id: "toothpaste", name: "Mint Paste",   short: "MINT",  grad: ["#80ffdb", "#48bfe3"], base: 1.15, retail: 3.6,  unlockCost: 420,  reqLevel: 3, tag: "Home" },
  // Level 4 items
  { id: "battery",  name: "Volt Cells",     short: "VOLT",  grad: ["#ff922b", "#e8590c"], base: 2.25, retail: 7.0,  unlockCost: 950,  reqLevel: 4, tag: "Tech" },
  { id: "icecream", name: "Chomp Bites",    short: "CHOMP", grad: ["#e5383b", "#6a040f"], base: 1.45, retail: 4.75, unlockCost: 1350, reqLevel: 4, tag: "Frozen" },
  { id: "petfood",  name: "Paw Treats",     short: "PAW",   grad: ["#d4a373", "#a98467"], base: 1.55, retail: 4.5,  unlockCost: 760,  reqLevel: 4, tag: "Pets" },
  { id: "shampoo",  name: "Foam Shampoo",   short: "FOAM",  grad: ["#a8dadc", "#457b9d"], base: 1.9,  retail: 5.4,  unlockCost: 1100, reqLevel: 4, tag: "Home" },
  // Level 5 items (endgame products)
  { id: "magazine", name: "Glossy Mags",    short: "GLOSS", grad: ["#c39bff", "#7d4dff"], base: 1.3,  retail: 4.25, unlockCost: 1750, reqLevel: 5, tag: "Print" },
  { id: "energy",   name: "Turbo Energy",   short: "TURBO", grad: ["#ffe45e", "#e8a800"], base: 1.45, retail: 4.9,  unlockCost: 1550, reqLevel: 5, tag: "Drinks" },
];

/**
 * Look up an item definition by its ID
 * @throws if item not found
 */
export const itemById = (id: string): ItemDef => {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Item not found: ${id}`);
  return item;
};

/* ==================== Daily Events ==================== */

/** Pool of possible daily events that modify gameplay */
export const EVENTS: DayEvent[] = [
  { id: "heat",    emoji: "🌞", name: "Heatwave!",        desc: "Everyone wants cold fizzy things today.",   traffic: 1.15, demand: { soda: 2.1, icecream: 2.3 }, bigCarts: false },
  { id: "rain",    emoji: "🌧️", name: "Rainy Day",        desc: "Fewer folks out shopping… cozy till vibes.",traffic: 0.7,  demand: { bread: 1.4 },                bigCarts: false },
  { id: "payday",  emoji: "💰", name: "Payday!",          desc: "Wallets are fat — carts are bigger.",       traffic: 1.35, demand: {},                            bigCarts: true },
  { id: "marathon",emoji: "🏃", name: "Marathon Weekend", desc: "Runners crave coffee and sugar.",           traffic: 1.1,  demand: { coffee: 2.4, candy: 1.6 },   bigCarts: false },
  { id: "health",  emoji: "🥗", name: "Health Kick",      desc: "Town went gym-mode. Soap up, snack down.",  traffic: 1.0,  demand: { soap: 2.0, chips: 0.5, candy: 0.5 }, bigCarts: false },
  { id: "tourbus", emoji: "🚌", name: "Tourist Bus",      desc: "Visitors grab batteries and magazines.",    traffic: 1.25, demand: { battery: 2.2, magazine: 2.2 }, bigCarts: false },
];

/* ==================== Customer Names ==================== */

/** Pool of customer names for random assignment */
export const NAMES = [
  "Betty", "Old Man Jenkins", "Zoe", "Marcus", "Priya", "Gus", "Lola", "Big Dave",
  "Mimi", "Coach Ray", "Tilly", "Hank", "Nia", "Walter", "Poppy", "DJ Bleu",
  "Rosa", "Ezra", "Duchess", "Sammy", "Vera", "Kip", "Aunt Mae", "Bruno",
];

/* ==================== Cost Formulas ==================== */

/**
 * Calculate cost to purchase an additional floor slot
 * Exponential growth based on number of slots already owned
 */
export const slotCost = (owned: number) =>
  Math.round(180 * Math.pow(1.42, owned - START_SLOTS));

/**
 * Calculate cost to place a new shelf
 * Increases with each shelf placed
 */
export const shelfCost = (count: number) =>
  Math.round(70 * Math.pow(1.3, count));

/**
 * Calculate one-time hiring cost for a staff member
 * Cashiers cost more than stockers, both scale with headcount
 */
export const hireCost = (kind: "cashier" | "stocker", n: number) =>
  Math.round(kind === "cashier" ? 150 * Math.pow(1.5, n) : 80 * Math.pow(1.35, n));

/** Minimum store level required to unlock each staff type */
export const STAFF_UNLOCK: Record<"cashier" | "stocker", number> = { cashier: 4, stocker: 2 };

/**
 * Calculate upgrade cost based on type and current level
 * Each upgrade type has its own base cost and growth multiplier
 */
export const upgradeCost = (kind: "speed" | "capacity" | "marketing" | "register" | "manualCarry", lvl: number) => {
  switch (kind) {
    case "speed":       return Math.round(187 * Math.pow(1.7, lvl));   // Faster checkout
    case "capacity":    return Math.round(65 * Math.pow(1.35, lvl));   // More shelf space
    case "marketing":   return Math.round(221 * Math.pow(1.75, lvl));  // More customers
    case "register":    return Math.round(272 * Math.pow(1.8, lvl));   // Larger queue
    case "manualCarry": return Math.round(95 * Math.pow(1.4, lvl));    // Bigger carry capacity
  }
};

/** Maximum level for each upgrade type */
export const upgradeMax = (kind: "speed" | "capacity" | "marketing" | "register" | "manualCarry") =>
  kind === "register" ? 3 : kind === "speed" ? 5 : kind === "capacity" ? 10 : kind === "manualCarry" ? 2 : 5;

/* ==================== Derived Game Values ==================== */

/** Calculate shelf capacity based on capacity upgrade level */
export const shelfCapacity = (capLvl: number) => 10 + 5 * capLvl;

/** Calculate maximum queue length based on number of registers */
export const queueCap = (registers: number) => 5 + 3 * (registers - 1);

/** Calculate time (in seconds) for automatic checkout per customer */
export const autoSeconds = (speedLvl: number) => 3.5 / (1 + 0.3 * speedLvl);

/** Calculate daily rent based on store size (slots) */
export const dailyRent = (slots: number) => 12 + slots * 2;

/**
 * Calculate total daily wages for all staff
 * Uses progressive wage ladder: each employee costs more than the last
 */
export const dailyWages = (cashiers: number, stockers: number) => {
  const n = cashiers + stockers;
  let total = 0;
  for (let k = 1; k <= n; k++) total += wageOf(k);
  return total;
};

/**
 * Calculate demand multiplier based on price vs retail suggestion
 * Lower prices increase demand, higher prices decrease it
 * Range: 0.25 (expensive) to 1.35 (cheap)
 */
export const demandFactor = (price: number, retail: number) =>
  clamp(2 - price / retail, 0.25, 1.35);

/** Clamp a value between min and max bounds */
export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/* ==================== Pricing Utilities ==================== */

/** Minimum allowed shelf price */
export const MIN_PRICE = 0.5;

/** Round price to nearest $0.25 increment (standard pricing grid) */
export const snap25 = (n: number) => Math.round(n * 4) / 4;

/**
 * Calculate maximum allowed price for an item
 * Capped at 2.4x retail price, snapped to quarter grid
 */
export const maxPrice = (def: ItemDef) => Math.floor(def.retail * 2.4 * 4) / 4;

/** Round to 2 decimal places for currency display */
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Format number as currency with 2 decimal places */
export const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format number as whole dollar amount (no cents) */
export const fmt0 = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

/**
 * Calculate effective wholesale price accounting for flash sales
 * Flash deals give 40% discount
 */
export const effPrice = (price: number, flash: boolean) =>
  round2(flash ? price * 0.6 : price);

/* ==================== Payment System ==================== */

/** Available change denominations for the POS mini-game (largest to smallest) */
export const CHANGE_DENOMS = [20, 10, 5, 2, 1, 0.5, 0.25];

/**
 * Calculate store level from experience points
 * Each level requires progressively more XP (level * 130)
 */
export const levelFromXp = (xp: number) => {
  let lvl = 1;
  let need = 0;
  while (xp >= need + lvl * 130) {
    need += lvl * 130;
    lvl++;
  }
  return { level: lvl, into: xp - need, need: lvl * 130 };
};
