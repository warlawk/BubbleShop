export interface ItemDef {
  id: string;
  name: string;
  short: string;
  grad: [string, string];
  base: number; // baseline wholesale price
  retail: number; // suggested retail price
  unlockCost: number;
  reqLevel: number;
  tag: string;
}

export interface MarketInfo {
  price: number;
  trend: number; // -1..1 momentum
  flash: boolean; // flash deal today (-40%)
}

export interface Shelf {
  id: number;
  slot: number;
  itemId: string | null;
  stock: number;
}

export interface CartLine {
  itemId: string;
  qty: number;
}

export interface Shopper {
  id: number;
  name: string;
  hue: number;
  cart: CartLine[];
  t: number; // seconds left browsing
}

export interface Queued {
  id: number;
  name: string;
  hue: number;
  cart: CartLine[];
  patience: number; // 1 -> 0
}

export interface POSLine {
  itemId: string;
  qty: number;
  left: number;
  price: number; // unit price locked at serve time
}

export interface POSState {
  custId: number;
  custName: string;
  hue: number;
  lines: POSLine[];
  total: number;
  tendered: number;
  given: number;
  time: number;
  maxTime: number;
  stage: "scan" | "pay";
  flashT: number; // increments on mistakes -> retriggers shake/flash
  lastMsg: string;
}

export interface Toast {
  id: number;
  text: string;
  kind: "good" | "bad" | "info";
}

export interface DayEvent {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  traffic: number;
  demand: Record<string, number>;
  bigCarts: boolean;
}

export interface DayStats {
  revenue: number;
  goods: number;
  wages: number;
  rent: number;
  tips: number;
  served: number;
  walkouts: number;
}

export type Phase = "start" | "prep" | "playing" | "summary" | "bankrupt" | "gameover" | "victory";

export interface GameState {
  v: number;
  phase: Phase;
  resumePhase: Phase;
  muted: boolean;
  manualMode: boolean;
  paused: boolean;
  redWarned: boolean; // overdraft grace used this stretch; resets on a positive day
  debug: boolean; // sandbox mode: infinite cash, level gates lifted
  endless: boolean;
  day: number;
  timeLeft: number;
  cash: number;
  xp: number;
  level: number;
  rep: number; // 0..5
  market: Record<string, MarketInfo>;
  storage: Record<string, number>;
  unlocked: string[];
  prices: Record<string, number>;
  slots: number;
  shelves: Shelf[];
  cashiers: number;
  stockers: number;
  speedLvl: number;
  capLvl: number;
  marketingLvl: number;
  registers: number;
  shoppers: Shopper[];
  queue: Queued[];
  pos: POSState | null;
  spawnAcc: number;
  autoAcc: number;
  stockAcc: number;
  nextId: number;
  stats: DayStats;
  lifetime: { served: number; earned: number; days: number };
  event: DayEvent | null;
  toasts: Toast[];
  bareWarnClock: number;
}

export type Action =
  | { type: "TICK"; dt: number }
  | { type: "NEW_GAME" }
  | { type: "CONTINUE" }
  | { type: "NEXT_DAY" }
  | { type: "OPEN_STORE" }
  | { type: "TAKE_RISK" }
  | { type: "GIVE_UP" }
  | { type: "BUY_STOCK"; itemId: string; qty: number }
  | { type: "SET_PRICE"; itemId: string; price: number }
  | { type: "PLACE_SHELF"; slot: number }
  | { type: "ASSIGN_SHELF"; shelfId: number; itemId: string | null }
  | { type: "RESTOCK_SHELF"; shelfId: number }
  | { type: "BUY_SLOT" }
  | { type: "HIRE"; kind: "cashier" | "stocker" }
  | { type: "UPGRADE"; kind: "speed" | "capacity" | "marketing" | "register" }
  | { type: "UNLOCK_ITEM"; itemId: string }
  | { type: "SERVE_NEXT" }
  | { type: "POS_SCAN"; itemId: string }
  | { type: "POS_GIVE"; denom: number }
  | { type: "POS_HAND" }
  | { type: "POS_ABORT" }
  | { type: "TOGGLE_MANUAL" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "TOGGLE_MUTE" }
  | { type: "TOGGLE_DEBUG" }
  | { type: "TOAST_OUT"; id: number }
  | { type: "KEEP_PLAYING" };
