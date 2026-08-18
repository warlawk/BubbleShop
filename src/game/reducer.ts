import {
  BASE_SPAWN, CARRY, CHANGE_DENOMS, DAY_LEN, DEBUG_FLOOR, EVENTS, GOAL, ITEMS,
  MAX_SLOTS, MAX_STAFF, NAMES, PATIENCE_SEC, SAVE_KEY, STAFF_UNLOCK,
  START_CASH, START_SLOTS, autoSeconds, clamp, dailyRent, dailyWages,
  demandFactor, effPrice, fmt, hireCost, itemById, levelFromXp, maxPrice,
  MIN_PRICE, queueCap, round2, shelfCapacity, shelfCost, slotCost, snap25,
  upgradeCost, upgradeMax, wageOf,
} from "./data";
import type {
  Action, CartLine, DayStats, GameState, MarketInfo, POSState, Queued, Shopper,
} from "./types";

/**
 * Game Reducer - Core Game Logic Engine
 * 
 * This module contains the heart of Bubble Mart Tycoon's game mechanics:
 * - State initialization and save/load management
 * - Real-time simulation (tick function) for shopper behavior, staffing, and day progression
 * - Action handlers for all player interactions (purchases, upgrades, hiring, POS minigame)
 * - Economic systems (cash flow, XP/leveling, reputation, daily expenses)
 * 
 * All state mutations follow Immer-style immutable patterns: create shallow copies,
 * modify nested objects as needed, and return the new state.
 */

/** Creates an empty DayStats object for tracking daily performance metrics */
const emptyStats = (): DayStats => ({
  revenue: 0, goods: 0, wages: 0, rent: 0, tips: 0, served: 0, walkouts: 0,
});

/** Predefined names for cashiers (assigned in order as you hire) */
const CASHIER_NAMES = ["Cassie", "Bobby", "Rex", "Dot"];
/** Predefined names for stockers (assigned in order as you hire) */
const STOCKER_NAMES = ["Stu", "Mona", "Fizz", "Fay"];

/**
 * Deducts money from cash on hand. In debug mode, purchases are free and cash
 * snaps back to DEBUG_FLOOR if it drops below. Returns false if insufficient funds.
 * @param s - Current game state (mutated in place)
 * @param cost - Amount to deduct
 * @returns true if payment succeeded (or debug mode), false if declined
 */
function pay(s: GameState, cost: number): boolean {
  if (!s.debug && s.cash + 1e-9 < cost) return false;
  s.cash = round2(s.cash - cost);
  if (s.debug && s.cash < DEBUG_FLOOR) s.cash = DEBUG_FLOOR;
  return true;
}

/**
 * Checks if a store level gate blocks an action. Debug mode bypasses all gates.
 * @param s - Current game state
 * @param lvl - Required store level to unlock
 * @returns true if blocked, false if allowed
 */
const gated = (s: GameState, lvl: number) => !s.debug && s.level < lvl;

/**
 * Creates a fresh game state with default starting values.
 * Initializes market prices, storage inventory, shelf stock, and all counters.
 * @returns A new GameState ready for a new game
 */
function fresh(): GameState {
  const market: Record<string, MarketInfo> = {};
  const storage: Record<string, number> = {};
  const prices: Record<string, number> = {};
  // Initialize market data and storage for each item type
  for (const it of ITEMS) {
    market[it.id] = { price: it.base, trend: 0, flash: false };
    storage[it.id] = 0;
    prices[it.id] = it.retail;
  }
  // Starting bonus inventory
  storage.soda = 26; storage.chips = 20; storage.bread = 14;
  return {
    v: 1, phase: "start", resumePhase: "playing",
    muted: false, manualMode: true, paused: false, redWarned: false, debug: false, endless: false,
    day: 1, timeLeft: DAY_LEN, cash: START_CASH,
    xp: 0, level: 1, rep: 3,
    market, storage,
    unlocked: ["soda", "chips", "bread"],
    prices,
    slots: START_SLOTS,
    shelves: [
      { id: 1, slot: 0, itemId: "soda", stock: 8 },
      { id: 2, slot: 1, itemId: "chips", stock: 8 },
      { id: 3, slot: 2, itemId: "bread", stock: 8 },
    ],
    cashiers: 0, stockers: 0, speedLvl: 0, capLvl: 0, marketingLvl: 0, registers: 1,
    shoppers: [], queue: [], pos: null,
    spawnAcc: 0, autoAcc: 0, stockAcc: 0, nextId: 100,
    stats: emptyStats(),
    lifetime: { served: 0, earned: 0, days: 0 },
    event: null, toasts: [], bareWarnClock: -1,
  };
}

/**
 * Initializes the game by loading from localStorage or creating a fresh state.
 * Validates save file integrity and sanitizes loaded data (prices clamped, phases reset).
 * @returns Loaded or fresh GameState
 */
export function initGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as GameState;
      if (s && s.v === 1 && typeof s.cash === "number") {
        s.pos = null;  // Reset any active POS minigame
        s.toasts = []; // Clear transient notifications
        s.paused = false;
        s.debug = !!s.debug;
        // Validate and clamp all prices to current game rules
        for (const id of Object.keys(s.prices)) {
          const def = itemById(id);
          s.prices[id] = round2(clamp(snap25(s.prices[id]), MIN_PRICE, maxPrice(def)));
        }
        // Determine which phase to resume based on saved state
        s.resumePhase =
          s.phase === "summary" ? "summary"
          : s.phase === "prep" ? "prep"
          : s.phase === "bankrupt" ? "bankrupt"
          : s.phase === "sweepstakes" ? "sweepstakes"
          : "playing";
        s.phase = "start"; // Always show start screen on load
        return s;
      }
    }
  } catch { /* corrupted save -> new game */ }
  return fresh();
}

/** Checks if a valid save file exists in localStorage */
export function hasSave(): boolean {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

/** Removes the save file from localStorage (used for New Game) */
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

/* ---------------- helpers (mutate a draft copy) ---------------- */

/**
 * Adds a toast notification to the queue (max 3 displayed, oldest dropped).
 * @param s - Current game state (mutated in place)
 * @param text - Message to display
 * @param kind - Notification type for styling (good/bad/info)
 */
function toast(s: GameState, text: string, kind: "good" | "bad" | "info" = "info") {
  s.toasts = [...s.toasts.slice(-3), { id: s.nextId++, text, kind }];
}

/**
 * Awards XP and checks for level-up. On level-up, grants a cash bonus.
 * @param s - Current game state (mutated in place)
 * @param n - XP points to award
 */
function addXp(s: GameState, n: number) {
  s.xp += n;
  const { level } = levelFromXp(s.xp);
  if (level > s.level) {
    s.level = level;
    const bonus = 30 + level * 15;
    s.cash = round2(s.cash + bonus);
    toast(s, `⭐ Store level ${level}! Bank bonus $${bonus}`, "good");
  }
}

/** Checks if the player has reached the victory cash goal (only in non-endless mode) */
function checkVictory(s: GameState) {
  if (!s.endless && s.phase === "playing" && s.cash >= GOAL) s.phase = "victory";
}

/**
 * Returns items to shelves or storage after a failed transaction.
 * Prioritizes filling shelf capacity first, then dumps remainder to storage.
 * @param s - Current game state (mutated in place)
 * @param itemId - Product ID to restock
 * @param qty - Quantity to return
 */
function giveBack(s: GameState, itemId: string, qty: number) {
  let left = qty;
  const cap = shelfCapacity(s.capLvl);
  for (const sh of s.shelves) {
    if (left <= 0) break;
    if (sh.itemId === itemId && sh.stock < cap) {
      const add = Math.min(left, cap - sh.stock);
      sh.stock += add;
      left -= add;
    }
  }
  if (left > 0) s.storage[itemId] = (s.storage[itemId] ?? 0) + left;
}

/** Returns all cart items back to shelves/storage for a cancelled transaction */
function returnCart(s: GameState, cart: CartLine[]) {
  for (const l of cart) giveBack(s, l.itemId, l.qty);
}

/**
 * Removes items from shelves to fulfill a customer's cart request.
 * @param s - Current game state (mutated in place)
 * @param itemId - Product ID to take
 * @param qty - Quantity requested
 * @returns Actual quantity taken (may be less if shelves are bare)
 */
function takeFromShelves(s: GameState, itemId: string, qty: number): number {
  let need = qty;
  const holders = s.shelves
    .filter((sh) => sh.itemId === itemId && sh.stock > 0)
    .sort((a, b) => b.stock - a.stock); // Take from fullest shelves first
  for (const sh of holders) {
    if (need <= 0) break;
    const take = Math.min(need, sh.stock);
    sh.stock -= take;
    need -= take;
  }
  return qty - need;
}

/**
 * Processes a completed sale: adds revenue, awards XP/reputation, checks victory.
 * @param s - Current game state (mutated in place)
 * @param cust - Customer object with cart
 * @param manual - True if player manually scanned (vs auto-checkout)
 * @param tip - Tip amount added to total
 */
function completeSale(s: GameState, cust: { cart: CartLine[] }, manual: boolean, tip: number) {
  let total = 0;
  let units = 0;
  for (const l of cust.cart) {
    total += l.qty * (s.prices[l.itemId] ?? itemById(l.itemId).retail);
    units += l.qty;
  }
  total = round2(total);
  s.cash = round2(s.cash + total + tip);
  s.stats.revenue = round2(s.stats.revenue + total);
  s.stats.tips = round2(s.stats.tips + tip);
  s.stats.served++;
  s.lifetime.served++;
  s.lifetime.earned = round2(s.lifetime.earned + total + tip);
  // Manual sales grant more reputation and XP (skill-based reward)
  s.rep = clamp(s.rep + (manual ? 0.045 : 0.015), 0, 5);
  addXp(s, units * 2 + (manual ? 6 : 0));
  checkVictory(s);
}

/**
 * Attempts to spawn a new shopper with a procedurally generated cart.
 * Returns null if shelves are bare (and shows a warning toast).
 * 
 * Cart generation algorithm:
 * 1. Weighted random selection based on price attractiveness, events, and shelf availability
 * 2. Random cart size (1-3 items, influenced by events)
 * 3. Items taken from shelves using takeFromShelves()
 * 
 * @param s - Current game state (mutated for shelf depletion)
 * @returns New Shopper or null if no items available
 */
function trySpawn(s: GameState): Shopper | null {
  const avail: Record<string, number> = {};
  // Count available stock per product ID across all shelves
  for (const sh of s.shelves) {
    if (sh.itemId && sh.stock > 0) avail[sh.itemId] = (avail[sh.itemId] ?? 0) + sh.stock;
  }
  const ids = Object.keys(avail);
  // No stock available - show bare shelves warning (throttled to avoid spam)
  if (ids.length === 0) {
    const bucket = s.day * 1000 + Math.floor((DAY_LEN - s.timeLeft) / 12);
    if (bucket !== s.bareWarnClock) {
      s.bareWarnClock = bucket;
      toast(s, "🧺 Shelves are bare — restock from your storage!", "bad");
    }
    return null;
  }

  // Weight function: lower prices and event demand increase attractiveness
  const w = (id: string) => {
    const def = itemById(id);
    const evMult = s.event?.demand[id] ?? 1;
    return demandFactor(s.prices[id] ?? def.retail, def.retail) * evMult * Math.sqrt(avail[id]);
  };

  const pool = [...ids];
  const cart: CartLine[] = [];
  const r1 = Math.random(), r2 = Math.random();
  // Cart size: 1-3 items with weighted probabilities (78% chance of +1, 48% chance of +1 more)
  let k = 1 + (r1 < 0.78 ? 1 : 0) + (r2 < 0.48 ? 1 : 0);
  k = Math.min(k, pool.length);
  // Weighted random selection without replacement
  for (let i = 0; i < k; i++) {
    const total = pool.reduce((a, id) => a + w(id), 0);
    if (total <= 0) break;
    let roll = Math.random() * total;
    let pick = pool[0];
    for (const id of pool) {
      roll -= w(id);
      if (roll <= 0) { pick = id; break; }
    }
    pool.splice(pool.indexOf(pick), 1);
    let qty = 1 + (Math.random() < 0.6 ? 1 : 0) + (s.event?.bigCarts ? 1 : 0);
    qty = Math.min(qty, 3, avail[pick]);
    if (qty < 1) continue;
    avail[pick] -= qty;
    const taken = takeFromShelves(s, pick, qty);
    if (taken > 0) cart.push({ itemId: pick, qty: taken });
  }
  if (cart.length === 0) return null;
  return {
    id: s.nextId++,
    name: NAMES[Math.floor(Math.random() * NAMES.length)],
    hue: Math.floor(Math.random() * 360),
    cart,
    t: 2.0 + Math.random() * 2.2, // Browse time: 2.0-4.2 seconds
  };
}

/**
 * Finalizes a successful POS minigame transaction with optional tip.
 * Shows a toast message detailing the payment and tip amount.
 * @param s - Current game state (mutated for cash/reputation/XP)
 * @param tip - Tip amount awarded for fast/accurate scanning
 */
function resolvePosSuccess(s: GameState, tip: number) {
  const p = s.pos!;
  const cart = p.lines.map((l) => ({ itemId: l.itemId, qty: l.qty }));
  completeSale(s, { cart }, true, tip);
  let total = 0;
  for (const l of p.lines) total += l.qty * l.price;
  total = round2(total);
  s.pos = null;
  toast(
    s,
    tip > 0
      ? `💰 ${p.custName} paid ${"$" + (total + tip).toFixed(2)} — includes a ${"$" + tip.toFixed(2)} tip!`
      : `✅ ${p.custName} paid ${"$" + total.toFixed(2)}${p.tendered === total ? " (exact change!)" : ""} — nice sale!`,
    "good"
  );
}

/* ---------------- tick ---------------- */

/**
 * Main game loop simulation function. Advances the game state by dt seconds.
 * Only runs when phase is "playing" and not paused.
 * 
 * Handles in order:
 * 1. POS minigame timer (freezes store while active)
 * 2. Day clock countdown and end-of-day processing
 * 3. Shopper spawning based on traffic formula
 * 4. Shopper browsing completion and queue management
 * 5. Customer patience decay and walkouts
 * 6. Auto-checkout by cashiers
 * 7. Stocker shelf restocking from storage
 * 
 * @param st - Current game state
 * @param dt - Delta time in seconds since last frame
 * @returns New GameState with all simulations applied
 */
function tick(st: GameState, dt: number): GameState {
  // No simulation during non-playing phases or when paused
  if (st.phase !== "playing" || st.paused) return st;
  
  // Create deep copies of mutable arrays/objects for immutable updates
  const s: GameState = {
    ...st,
    shoppers: st.shoppers.map((c) => ({ ...c })),
    queue: st.queue.map((c) => ({ ...c })),
    shelves: st.shelves.map((sh) => ({ ...sh })),
    storage: { ...st.storage },
    stats: { ...st.stats },
    lifetime: { ...st.lifetime },
    pos: st.pos ? { ...st.pos, lines: st.pos.lines.map((l) => ({ ...l })) } : null,
  };

  /* --- POS minigame runs on its own clock; the store freezes meanwhile --- */
  if (s.pos) {
    s.pos.time -= dt;
    if (s.pos.time <= 0) {
      const p = s.pos;
      // Timeout: customer leaves, items returned to shelves, reputation hit
      returnCart(s, p.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })));
      s.stats.walkouts++;
      s.rep = clamp(s.rep - 0.07, 0, 5);
      toast(s, `😤 ${p.custName} stormed out of the register!`, "bad");
      s.pos = null;
    }
    return s; // Store frozen until POS completes
  }

  /* --- day clock --- */
  s.timeLeft -= dt;
  if (s.timeLeft <= 0) {
    s.timeLeft = 0;
    // End of day: return all unsold items to shelves/storage
    for (const c of s.shoppers) returnCart(s, c.cart);
    for (const c of s.queue) returnCart(s, c.cart);
    s.shoppers = [];
    s.queue = [];
    // Calculate daily expenses
    const wages = dailyWages(s.cashiers, s.stockers);
    const rent = dailyRent(s.slots);
    s.stats.wages = wages;
    s.stats.rent = rent;
    s.cash = round2(s.cash - wages - rent);
    if (s.debug && s.cash < DEBUG_FLOOR) s.cash = DEBUG_FLOOR;
    s.lifetime.days++;
    s.autoAcc = 0;
    // Bankruptcy logic: first strike = warning, second strike = game over
    if (s.cash < 0) {
      if (s.redWarned) {
        s.phase = "gameover"; // second strike — the bank takes over
      } else {
        s.phase = "bankrupt"; // first time in the red: offer one grace day
      }
    } else {
      s.redWarned = false; // survived in the black — the warning resets
      s.phase = "summary";
    }
    return s;
  }

  /* --- spawning --- */
  // Traffic formula: sinusoidal daily curve × day progression × staff bonus × rep × marketing × level × events
  const p = 1 - s.timeLeft / DAY_LEN;
  const curve = 1 + 0.35 * Math.sin(p * Math.PI * 4 - Math.PI / 2);
  const dayRamp = Math.min(1.3, 0.55 + 0.075 * (s.day - 1)); // quiet opening week, busy later on
  const staffPull = 0.85 + 0.08 * Math.min(s.cashiers, 3); // staffed tills pull extra shoppers; solo stays gentle
  const traffic =
    BASE_SPAWN * curve * dayRamp * staffPull *
    (0.45 + s.rep * 0.22) *
    (1 + 0.15 * s.marketingLvl) *
    (1 + 0.05 * (s.level - 1)) *
    (s.event?.traffic ?? 1);
  s.spawnAcc += dt * traffic;
  while (s.spawnAcc >= 1) {
    s.spawnAcc -= 1;
    const c = trySpawn(s);
    if (c) s.shoppers.push(c);
  }

  /* --- shoppers finish browsing -> join line --- */
  const cap = queueCap(s.registers);
  for (const c of s.shoppers) c.t -= dt;
  const done = s.shoppers.filter((c) => c.t <= 0);
  s.shoppers = s.shoppers.filter((c) => c.t > 0);
  for (const c of done) {
    if (s.queue.length >= cap) {
      // Queue full: customer leaves, walkout penalty
      returnCart(s, c.cart);
      s.stats.walkouts++;
      s.rep = clamp(s.rep - 0.03, 0, 5);
      if (Math.random() < 0.5) toast(s, `🚶 ${c.name} left — line out the door!`, "bad");
    } else {
      s.queue.push({ id: c.id, name: c.name, hue: c.hue, cart: c.cart, patience: 1 });
    }
  }

  /* --- patience --- */
  const stillWaiting: Queued[] = [];
  for (const c of s.queue) {
    c.patience -= dt / PATIENCE_SEC;
    if (c.patience <= 0) {
      // Impatient customer leaves, bigger reputation hit
      returnCart(s, c.cart);
      s.stats.walkouts++;
      s.rep = clamp(s.rep - 0.08, 0, 5);
      toast(s, `😤 ${c.name} stormed out — too slow!`, "bad");
    } else stillWaiting.push(c);
  }
  s.queue = stillWaiting;

  /* --- cashiers auto-ring the line --- */
  if (s.cashiers > 0 && s.queue.length > 0) {
    const workers = Math.min(s.cashiers, s.registers); // Can't use more registers than owned
    // Speed upgrade reduces time per customer; accumulation allows fractional progress
    s.autoAcc += (dt * workers) / autoSeconds(s.speedLvl);
    while (s.autoAcc >= 1 && s.queue.length > 0) {
      s.autoAcc -= 1;
      const c = s.queue.shift()!;
      completeSale(s, c, false, 0); // Auto sales: no tip, lower XP/reputation
    }
    if (s.queue.length === 0) s.autoAcc = 0;
  } else {
    s.autoAcc = 0;
  }

  /* --- stockers refill shelves from storage --- */
  if (s.stockers > 0) {
    s.stockAcc += dt * s.stockers * 2.0; // Each stocker contributes 2 moves/sec
    const shelfCap = shelfCapacity(s.capLvl);
    let moves = Math.floor(s.stockAcc);
    s.stockAcc -= moves; // Keep fractional remainder for smooth animation
    moves = Math.min(moves, 20); // Cap moves per tick to prevent lag spikes
    for (let i = 0; i < moves; i++) {
      // Find the shelf with the biggest deficit that has stock in storage
      let best: { shelf: (typeof s.shelves)[number]; deficit: number } | null = null;
      for (const sh of s.shelves) {
        if (!sh.itemId) continue;
        if ((s.storage[sh.itemId] ?? 0) <= 0) continue;
        const deficit = shelfCap - sh.stock;
        if (deficit <= 0) continue;
        if (!best || deficit > best.deficit) best = { shelf: sh, deficit };
      }
      if (!best) { s.stockAcc = 0; break; } // All shelves full or no storage
      best.shelf.stock++;
      s.storage[best.shelf.itemId!]--;
    }
  }

  return s;
}

/* ---------------- day rollover ---------------- */

/**
 * Prepares the next day: resets stats, updates market prices, generates events.
 * Market price algorithm: random drift + trend influence, clamped to ±32% of base.
 * Special handling for day 5 sweepstakes and rare scratch-off windfalls.
 * @param st - Current game state at day end
 * @returns New GameState ready for prep phase
 */
function startNextDay(st: GameState): GameState {
  const s: GameState = {
    ...st, storage: { ...st.storage }, stats: emptyStats(),
    spawnAcc: 0, stockAcc: 0, autoAcc: 0, shoppers: [], queue: [],
    day: st.day + 1, timeLeft: DAY_LEN, phase: "prep", toasts: [...st.toasts],
  };
  const market: Record<string, MarketInfo> = {};
  // Update each product's wholesale price with drift and trend
  for (const it of ITEMS) {
    const m = s.market[it.id];
    const drift = m.price * (Math.random() - 0.5) * 0.14 + m.trend * it.base * 0.035;
    const trend = clamp(m.trend + (Math.random() - 0.5) * 0.7, -1, 1);
    const price = round2(clamp(m.price + drift, it.base * 0.78, it.base * 1.32));
    market[it.id] = { price, trend, flash: false };
  }
  // 60% chance of a flash sale on a random unlocked product
  if (Math.random() < 0.6 && s.unlocked.length > 0) {
    const id = s.unlocked[Math.floor(Math.random() * s.unlocked.length)];
    market[id].flash = true;
    toast(s, `⚡ Flash deal: ${itemById(id).name} wholesale −40% today!`, "info");
  }
  // 32% chance of a daily event affecting traffic/demand
  s.event = Math.random() < 0.32 ? EVENTS[Math.floor(Math.random() * EVENTS.length)] : null;
  if (s.event) toast(s, `📰 ${s.event.name} ${s.event.desc}`, "info");
  s.market = market;
  /* day 5 lucky break — big center-screen announcement */
  if (s.day === 5) {
    s.cash = round2(s.cash + 200);
    s.phase = "sweepstakes"; // store opens once the win is claimed
  } else if (Math.random() < 0.005) {
    // 0.5% rare scratch-off windfall
    s.cash = round2(s.cash + 200);
    toast(s, "🎉 Lucky scratch-off! You won $200!", "good");
  }
  return s;
}

/* ---------------- main reducer ---------------- */

/**
 * Main game reducer - handles all player actions and state transitions.
 * Follows Redux-style pattern: pure function, immutable updates, action dispatching.
 * 
 * Action categories:
 * - Game flow: NEW_GAME, CONTINUE, TICK, NEXT_DAY, OPEN_STORE
 * - Bankruptcy/Victory: TAKE_RISK, GIVE_UP, KEEP_PLAYING, CLAIM_SWEEPSTAKES
 * - Purchasing: BUY_STOCK, BUY_ALL, AUTO_STOCK_SHELVES
 * - Store management: SET_PRICE, PLACE_SHELF, ASSIGN_SHELF, RESTOCK_SHELF, BUY_SLOT
 * - Staffing: HIRE
 * - Upgrades: UPGRADE (speed, capacity, marketing, registers)
 * - Product unlocks: UNLOCK_ITEM
 * - POS minigame: SERVE_NEXT, POS_SCAN, POS_GIVE, POS_HAND, POS_ABORT
 * - Settings: TOGGLE_MANUAL, TOGGLE_PAUSE, TOGGLE_MUTE, TOGGLE_DEBUG
 * - UI: TOAST_OUT
 * 
 * @param st - Current game state
 * @param a - Action to process
 * @returns New GameState after applying the action
 */
export function reducer(st: GameState, a: Action): GameState {
  switch (a.type) {
    // --- Game Loop ---
    case "TICK":
      return tick(st, a.dt);

    case "NEW_GAME": {
      clearSave();
      return { ...fresh(), phase: "prep" };
    }

    case "CONTINUE": {
      const s = { ...st };
      s.phase = s.resumePhase;
      return s;
    }

    case "KEEP_PLAYING": {
      // Enable endless mode after reaching the victory goal
      const s = { ...st, endless: true, phase: "playing" as const };
      return s;
    }

    case "NEXT_DAY":
      return startNextDay(st);

    // --- Bankruptcy & Victory ---
    case "TAKE_RISK": {
      if (st.phase !== "bankrupt") return st;
      const s = startNextDay({ ...st, redWarned: true, toasts: [...st.toasts] });
      toast(s, "🏦 The bank grants one last day — finish it in the black!", "info");
      return s;
    }

    case "GIVE_UP": {
      if (st.phase !== "bankrupt") return st;
      return { ...st, phase: "gameover" };
    }

    case "CLAIM_SWEEPSTAKES": {
      if (st.phase !== "sweepstakes") return st;
      return { ...st, phase: "prep" };
    }

    // --- Store Operations ---
    case "OPEN_STORE": {
      if (st.phase !== "prep") return st;
      const s: GameState = { ...st, phase: "playing", toasts: [...st.toasts] };
      toast(s, "🔔 Sign flipped — doors open!", "good");
      return s;
    }

    case "BUY_STOCK": {
      const s = { ...st, storage: { ...st.storage }, stats: { ...st.stats }, toasts: [...st.toasts] };
      const m = s.market[a.itemId];
      if (!m) return st;
      const unit = effPrice(m.price, m.flash); // Apply flash discount if active
      const cost = round2(unit * a.qty);
      if (!pay(s, cost)) {
        toast(s, "💸 Not enough cash for that order!", "bad");
        return s;
      }
      s.storage[a.itemId] = (s.storage[a.itemId] ?? 0) + a.qty;
      s.stats.goods = round2(s.stats.goods + cost);
      return s;
    }

    case "BUY_ALL": {
      // Bulk purchase across all unlocked products (optionally only empty ones)
      const s: GameState = { ...st, storage: { ...st.storage }, stats: { ...st.stats }, toasts: [...st.toasts] };
      let spent = 0, units = 0, products = 0, skipped = 0;
      for (const def of ITEMS) {
        if (!s.unlocked.includes(def.id)) continue;
        if (a.onlyEmpty && (s.storage[def.id] ?? 0) > 0) continue;
        const m = s.market[def.id];
        const cost = round2(effPrice(m.price, m.flash) * a.qty);
        if (!pay(s, cost)) { skipped++; continue; }
        s.storage[def.id] = (s.storage[def.id] ?? 0) + a.qty;
        s.stats.goods = round2(s.stats.goods + cost);
        spent = round2(spent + cost);
        units += a.qty;
        products++;
      }
      if (products === 0) {
        toast(s, skipped > 0 ? "💸 Not enough cash for any of those orders!" : a.onlyEmpty ? "📦 Nothing in the back room is empty!" : "📦 No unlocked products to buy!", "bad");
        return s;
      }
      toast(s, `🚚 Wholesale truck: +${units} units across ${products} product${products > 1 ? "s" : ""} for ${fmt(spent)}${skipped > 0 ? ` (${skipped} skipped — low cash)` : ""}`, "good");
      return s;
    }

    case "AUTO_STOCK_SHELVES": {
      // Automatically assigns unlocked products to empty shelves (highest retail first)
      const s: GameState = { ...st, shelves: st.shelves.map((sh) => ({ ...sh })), toasts: [...st.toasts] };
      const used = new Set(s.shelves.filter((sh) => sh.itemId).map((sh) => sh.itemId as string));
      const free = s.unlocked
        .filter((id) => !used.has(id))
        .sort((x, y) => itemById(y).retail - itemById(x).retail); // Prioritize premium products
      let placed = 0;
      for (const sh of s.shelves) {
        if (sh.itemId || free.length === 0) continue;
        sh.itemId = free.shift() as string;
        placed++;
      }
      if (placed === 0) {
        toast(s, s.unlocked.every((id) => used.has(id))
          ? "🤖 Every unlocked product already has a shelf!"
          : "🤖 No empty shelves left to fill!", "info");
        return s;
      }
      toast(s, `🤖 Auto-placed ${placed} new product${placed > 1 ? "s" : ""} on empty shelves!`, "good");
      return s;
    }

    case "SET_PRICE": {
      // Clamp price to valid range and snap to nearest $0.25
      const def = itemById(a.itemId);
      const s = { ...st, prices: { ...st.prices } };
      s.prices[a.itemId] = round2(clamp(snap25(a.price), MIN_PRICE, maxPrice(def)));
      return s;
    }

    case "PLACE_SHELF": {
      // Purchase and install a new physical shelf in an empty slot
      const s = { ...st, shelves: [...st.shelves], toasts: [...st.toasts] };
      if (a.slot >= s.slots) return st; // Slot out of bounds
      if (s.shelves.some((sh) => sh.slot === a.slot)) return st; // Already occupied
      const cost = shelfCost(s.shelves.length); // Cost scales with shelf count
      if (!pay(s, cost)) {
        toast(s, "💸 Can't afford a shelf right now!", "bad");
        return s;
      }
      s.shelves.push({ id: s.nextId++, slot: a.slot, itemId: null, stock: 0 });
      toast(s, "🛠️ New shelf installed — pick what to stock!", "good");
      return s;
    }

    case "ASSIGN_SHELF": {
      // Change which product a shelf holds; return old stock to storage
      const s = { ...st, shelves: st.shelves.map((sh) => ({ ...sh })), storage: { ...st.storage } };
      const sh = s.shelves.find((x) => x.id === a.shelfId);
      if (!sh) return st;
      if (sh.itemId && sh.stock > 0) giveBack(s, sh.itemId, sh.stock);
      sh.stock = 0;
      sh.itemId = a.itemId;
      return s;
    }

    case "RESTOCK_SHELF": {
      // Manually carry items from storage to a shelf (limited by CARRY capacity)
      const s = { ...st, shelves: st.shelves.map((sh) => ({ ...sh })), storage: { ...st.storage } };
      const sh = s.shelves.find((x) => x.id === a.shelfId);
      if (!sh || !sh.itemId) return st;
      const cap = shelfCapacity(s.capLvl);
      const take = Math.min(CARRY, cap - sh.stock, s.storage[sh.itemId] ?? 0);
      if (take <= 0) return st;
      sh.stock += take;
      s.storage[sh.itemId] -= take;
      return s;
    }

    case "BUY_SLOT": {
      // Lease additional floor space for more shelves
      const s = { ...st, toasts: [...st.toasts] };
      if (s.slots >= MAX_SLOTS) return st;
      const cost = slotCost(s.slots);
      if (!pay(s, cost)) {
        toast(s, "💸 The landlord wants more money first!", "bad");
        return s;
      }
      s.slots++;
      toast(s, "🏗️ Leased more floor space!", "good");
      return s;
    }

    case "HIRE": {
      // Hire a cashier or stocker; wage determined by total staff ladder position
      const s = { ...st, toasts: [...st.toasts] };
      const n = a.kind === "cashier" ? s.cashiers : s.stockers;
      if (n >= MAX_STAFF) return st;
      const unlockLvl = STAFF_UNLOCK[a.kind];
      if (gated(s, unlockLvl)) {
        toast(s, `🔒 ${a.kind === "cashier" ? "Cashiers" : "Stockers"} unlock at store level ${unlockLvl}!`, "bad");
        return s;
      }
      const cost = hireCost(a.kind, n);
      if (!pay(s, cost)) {
        toast(s, "💸 Can't cover the signing bonus!", "bad");
        return s;
      }
      const wage = wageOf(s.cashiers + s.stockers + 1); // ladder position of this new hire
      if (a.kind === "cashier") {
        s.cashiers++;
        toast(s, `🧑‍💼 Cashier ${CASHIER_NAMES[n]} joined the till! Wage $${wage}/day`, "good");
      } else {
        s.stockers++;
        toast(s, `📦 Stocker ${STOCKER_NAMES[n]} is on shelves duty! Wage $${wage}/day`, "good");
      }
      return s;
    }

    case "UPGRADE": {
      // Purchase permanent upgrades: speed, capacity, marketing, or registers
      const s = { ...st, toasts: [...st.toasts] };
      if ((a.kind === "speed" || a.kind === "register") && gated(s, 4)) {
        toast(s, "🔒 That unlocks at store Lv 4, alongside cashiers!", "bad");
        return s;
      }
      const lvlOf = {
        speed: s.speedLvl, capacity: s.capLvl, marketing: s.marketingLvl,
        register: s.registers - 1,
      }[a.kind];
      const max = upgradeMax(a.kind);
      if (lvlOf >= max) return st;
      const cost = upgradeCost(a.kind, lvlOf);
      if (!pay(s, cost)) {
        toast(s, "💸 Not enough cash for that upgrade!", "bad");
        return s;
      }
      if (a.kind === "speed") { s.speedLvl++; toast(s, "⚡ POS training complete — cashiers ring faster!", "good"); }
      if (a.kind === "capacity") { s.capLvl++; toast(s, "📚 Deeper shelves — +5 capacity each!", "good"); }
      if (a.kind === "marketing") { s.marketingLvl++; toast(s, "📣 Marketing blast — more feet on Main Street!", "good"); }
      if (a.kind === "register") { s.registers++; toast(s, "🧾 New cash register installed — bigger line capacity!", "good"); }
      return s;
    }

    case "UNLOCK_ITEM": {
      // Unlock a new product for purchase; requires store level and cash
      const s = { ...st, unlocked: [...st.unlocked], prices: { ...st.prices }, toasts: [...st.toasts] };
      const def = itemById(a.itemId);
      if (s.unlocked.includes(a.itemId)) return st;
      if (gated(s, def.reqLevel) || !pay(s, def.unlockCost)) {
        toast(s, "💸 You can't unlock that product yet!", "bad");
        return s;
      }
      s.unlocked.push(a.itemId);
      s.prices[a.itemId] = def.retail; // Start at suggested retail price
      toast(s, `🎉 Supplier deal signed — ${def.name} now available!`, "good");
      return s;
    }

    // --- POS Minigame ---
    case "SERVE_NEXT": {
      // Pull next customer from queue into the POS scanning minigame
      if (st.pos || st.queue.length === 0) return st;
      const s: GameState = {
        ...st,
        queue: st.queue.slice(1),
        shelves: st.shelves.map((sh) => ({ ...sh })),
        storage: { ...st.storage },
        stats: { ...st.stats },
        lifetime: { ...st.lifetime },
        toasts: [...st.toasts],
      };
      const c = st.queue[0];
      // Build scan lines with current prices
      const lines = c.cart.map((l) => ({
        itemId: l.itemId, qty: l.qty, left: l.qty,
        price: s.prices[l.itemId] ?? itemById(l.itemId).retail,
      }));
      let units = 0;
      let total = 0;
      for (const l of lines) { units += l.qty; total += l.qty * l.price; }
      const maxTime = 18 + 3 * units; // Base time + 3 sec per item
      const pos: POSState = {
        custId: c.id, custName: c.name, hue: c.hue,
        lines, total: round2(total), tendered: 0, given: 0,
        time: maxTime, maxTime, stage: "scan", flashT: 0, lastMsg: "",
      };
      s.pos = pos;
      return s;
    }

    case "POS_SCAN": {
      // Scan an item during the scanning phase
      if (!st.pos || st.pos.stage !== "scan") return st;
      const s = { ...st, pos: { ...st.pos, lines: st.pos.lines.map((l) => ({ ...l })) } };
      const p = s.pos!;
      const line = p.lines.find((l) => l.itemId === a.itemId && l.left > 0);
      if (!line) return st; // UI only offers scannable lines
      line.left--;
      p.lastMsg = "";
      // All items scanned -> transition to payment phase
      if (p.lines.every((l) => l.left === 0)) {
        p.stage = "pay";
        const bills = [5, 10, 20, 50, 100];
        let t = bills.find((b) => b >= p.total); // Customer picks bill denomination
        if (!t) t = 100 * Math.ceil(p.total / 100);
        if (Math.random() < 0.2 && Number.isInteger(p.total)) t = p.total; // 20% exact change if whole dollar
        p.tendered = t;
        if (t === p.total) resolvePosSuccess(s, 0); // Exact change = instant success
      }
      return s;
    }

    case "POS_GIVE": {
      // Give change denomination during payment phase
      if (!st.pos || st.pos.stage !== "pay") return st;
      const s = { ...st, pos: { ...st.pos } };
      const p = s.pos!;
      const due = round2(p.tendered - p.total);
      if (round2(p.given + a.denom) > due + 1e-9) {
        // Overpaid - flash error
        p.flashT++;
        p.lastMsg = "Too much change!";
        return s;
      }
      p.given = round2(p.given + a.denom);
      p.lastMsg = "";
      return s;
    }

    case "POS_HAND": {
      // Hand over the collected change to customer
      if (!st.pos || st.pos.stage !== "pay") return st;
      const s: GameState = {
        ...st,
        pos: { ...st.pos },
        shelves: st.shelves.map((sh) => ({ ...sh })),
        storage: { ...st.storage },
        stats: { ...st.stats },
        lifetime: { ...st.lifetime },
        toasts: [...st.toasts],
      };
      const p = s.pos!;
      const due = round2(p.tendered - p.total);
      if (Math.abs(p.given - due) < 0.001) {
        // Correct change awarded; tip if fast enough (>45% time remaining)
        const fast = p.time / p.maxTime > 0.45;
        const tip = fast ? round2(Math.max(0.6, p.total * 0.15)) : 0;
        resolvePosSuccess(s, tip);
      } else {
        // Wrong amount - penalty: time loss, reset given, flash error
        p.time = Math.max(0.4, p.time - 2.5);
        p.given = 0;
        p.flashT++;
        p.lastMsg = "Wrong change — try again!";
      }
      return s;
    }

    case "POS_ABORT": {
      // Cancel the POS minigame and return customer to queue (with reduced patience)
      if (!st.pos) return st;
      const s: GameState = { ...st, pos: null, queue: [...st.queue] };
      const p = st.pos;
      s.queue.unshift({
        id: p.custId, name: p.custName, hue: p.hue,
        cart: p.lines.map((l) => ({ itemId: l.itemId, qty: l.qty })),
        patience: 0.55, // Penalty: returned customer has ~55% patience left
      });
      return s;
    }

    // --- Settings & UI ---
    case "TOGGLE_MANUAL":
      return { ...st, manualMode: !st.manualMode };

    case "TOGGLE_PAUSE":
      if (st.phase !== "playing") return st;
      return { ...st, paused: !st.paused };

    case "TOGGLE_MUTE":
      return { ...st, muted: !st.muted };

    case "TOGGLE_DEBUG": {
      // Enable sandbox mode: infinite cash, no level gates
      const s: GameState = { ...st, debug: !st.debug, toasts: [...st.toasts] };
      if (s.debug) {
        s.cash = Math.max(s.cash, DEBUG_FLOOR);
        toast(s, "🧪 SANDBOX MODE — infinite cash, all level gates lifted!", "good");
      } else {
        toast(s, "🧪 Sandbox mode off — back to the grind!", "info");
      }
      return s;
    }

    case "TOAST_OUT":
      // Dismiss a toast notification by ID
      return { ...st, toasts: st.toasts.filter((t) => t.id !== a.id) };

    default:
      return st;
  }
}
