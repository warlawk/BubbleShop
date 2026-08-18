/**
 * ItemDef - Definition of a product available in the store
 * Each item has visual properties (gradient colors), economic properties (prices),
 * and progression gates (unlock cost, required level)
 */
export interface ItemDef {
  /** Unique identifier for the item (e.g., "soda", "chips") */
  id: string;
  /** Display name shown to players (e.g., "Fizz Cola") */
  name: string;
  /** Short label for UI elements (e.g., "FIZZ") */
  short: string;
  /** Two-color gradient for visual styling [startColor, endColor] */
  grad: [string, string];
  /** Base wholesale price - the supplier's base cost before daily fluctuations */
  base: number;
  /** Suggested retail price - the recommended selling price */
  retail: number;
  /** One-time cost to unlock this item for sale */
  unlockCost: number;
  /** Minimum store level required to unlock this item */
  reqLevel: number;
  /** Product category for grouping (e.g., "Drinks", "Snacks") */
  tag: string;
}

/**
 * MarketInfo - Daily market conditions for an item
 * Tracks wholesale pricing and trends that change each day
 */
export interface MarketInfo {
  /** Current wholesale unit price for today */
  price: number;
  /** Price momentum: -1 (falling) to 1 (rising), affects tomorrow's price */
  trend: number;
  /** Flash sale flag: when true, wholesale is 40% off for today only */
  flash: boolean;
}

/**
 * Shelf - A physical shelf unit in the store
 * Shelves hold specific items and have limited capacity
 */
export interface Shelf {
  /** Unique identifier for this shelf */
  id: number;
  /** Slot position (0 to slots-1) for layout ordering */
  slot: number;
  /** ID of the item assigned to this shelf, or null if empty */
  itemId: string | null;
  /** Current stock level on the shelf */
  stock: number;
}

/**
 * CartLine - A single item entry in a customer's cart
 */
export interface CartLine {
  /** Item identifier */
  itemId: string;
  /** Quantity of this item */
  qty: number;
}

/**
 * Shopper - A customer currently browsing the store floor
 */
export interface Shopper {
  /** Unique customer ID */
  id: number;
  /** Customer's display name */
  name: string;
  /** Hue value for generating customer's unique color */
  hue: number;
  /** Items the customer wants to purchase */
  cart: CartLine[];
  /** Seconds remaining before customer finishes browsing and joins queue */
  t: number;
}

/**
 * Queued - A customer waiting in the checkout line
 */
export interface Queued {
  /** Unique customer ID */
  id: number;
  /** Customer's display name */
  name: string;
  /** Hue value for customer's color */
  hue: number;
  /** Items to purchase */
  cart: CartLine[];
  /** Patience level: starts at 1, decreases over time, causes walkout at 0 */
  patience: number;
}

/**
 * POSLine - An item being processed at the point-of-sale
 */
export interface POSLine {
  /** Item identifier */
  itemId: string;
  /** Total quantity to scan */
  qty: number;
  /** Remaining items left to scan */
  left: number;
  /** Unit price locked at the start of the transaction */
  price: number;
}

/**
 * POSState - State machine for the checkout mini-game
 * Tracks the scanning and payment phases for a single customer
 */
export interface POSState {
  /** Customer ID */
  custId: number;
  /** Customer's display name */
  custName: string;
  /** Customer's hue color value */
  hue: number;
  /** Items being scanned/paid for */
  lines: POSLine[];
  /** Total amount due */
  total: number;
  /** Amount the customer has handed over */
  tendered: number;
  /** Change given back so far */
  given: number;
  /** Time remaining to complete the transaction */
  time: number;
  /** Maximum time allowed for this transaction */
  maxTime: number;
  /** Current phase: "scan" items or "pay" with change */
  stage: "scan" | "pay";
  /** Error counter - increments on wrong change, triggers visual feedback */
  flashT: number;
  /** Last feedback message to display to player */
  lastMsg: string;
}

/**
 * Toast - A temporary notification message
 */
export interface Toast {
  /** Unique toast ID for removal */
  id: number;
  /** Message text */
  text: string;
  /** Notification type for styling */
  kind: "good" | "bad" | "info";
}

/**
 * DayEvent - A special daily event that modifies gameplay
 */
export interface DayEvent {
  /** Event identifier */
  id: string;
  /** Emoji icon representing the event */
  emoji: string;
  /** Event title */
  name: string;
  /** Description of effects */
  desc: string;
  /** Multiplier for customer spawn rate */
  traffic: number;
  /** Demand multipliers for specific items (item_id -> multiplier) */
  demand: Record<string, number>;
  /** When true, customers buy more items per visit */
  bigCarts: boolean;
}

/**
 * DayStats - Financial and performance tracking for the current day
 */
export interface DayStats {
  /** Total sales revenue */
  revenue: number;
  /** Cost of goods purchased from suppliers */
  goods: number;
  /** Staff wages for the day */
  wages: number;
  /** Rent expense */
  rent: number;
  /** Tips earned from manual checkout */
  tips: number;
  /** Number of customers served */
  served: number;
  /** Customers who left without buying */
  walkouts: number;
}

/** Game phase states for the state machine */
export type Phase =
  | "start"       // Initial menu screen
  | "prep"        // Day preparation (buying stock, arranging shelves)
  | "playing"     // Store is open, customers arriving
  | "summary"     // End-of-day financial summary
  | "bankrupt"    // Negative cash, one chance to recover
  | "sweepstakes" // Special event screen
  | "gameover"    // Permanent game over
  | "victory";    // Reached the goal amount

/**
 * GameState - Complete state of the game
 * This is the single source of truth for the entire game
 */
export interface GameState {
  /** Save format version */
  v: number;
  /** Current game phase */
  phase: Phase;
  /** Phase to resume to after start screen */
  resumePhase: Phase;
  /** Sound effects muted */
  muted: boolean;
  /** Manual checkout mode enabled */
  manualMode: boolean;
  /** Game paused */
  paused: boolean;
  /** Overdraft warning flag - set when ending day with negative cash */
  redWarned: boolean;
  /** Debug/sandbox mode: infinite money, no level requirements */
  debug: boolean;
  /** Endless mode: continue playing after reaching goal */
  endless: boolean;
  /** Current day number (starts at 1) */
  day: number;
  /** Seconds remaining in the day */
  timeLeft: number;
  /** Current cash on hand */
  cash: number;
  /** Experience points earned */
  xp: number;
  /** Current store level */
  level: number;
  /** Store reputation: 0 (terrible) to 5 (excellent) */
  rep: number;
  /** Market prices and trends for all items */
  market: Record<string, MarketInfo>;
  /** Back room storage inventory (item_id -> quantity) */
  storage: Record<string, number>;
  /** List of unlocked item IDs */
  unlocked: string[];
  /** Shelf prices for all items (item_id -> price) */
  prices: Record<string, number>;
  /** Number of floor slots owned */
  slots: number;
  /** All placed shelves */
  shelves: Shelf[];
  /** Number of hired cashiers */
  cashiers: number;
  /** Number of hired stockers */
  stockers: number;
  /** Checkout speed upgrade level */
  speedLvl: number;
  /** Shelf capacity upgrade level */
  capLvl: number;
  /** Marketing upgrade level */
  marketingLvl: number;
  /** Manual carry capacity upgrade tier (0=base, 1=tier1, 2=tier2) */
  manualCarryLvl: number;
  /** Number of checkout registers */
  registers: number;
  /** Customers currently browsing */
  shoppers: Shopper[];
  /** Customers in checkout queue */
  queue: Queued[];
  /** Active checkout session, or null */
  pos: POSState | null;
  /** Accumulator for customer spawning */
  spawnAcc: number;
  /** Accumulator for automatic checkout progress */
  autoAcc: number;
  /** Accumulator for automatic restocking progress */
  stockAcc: number;
  /** Next available entity ID */
  nextId: number;
  /** Today's statistics */
  stats: DayStats;
  /** Lifetime career statistics */
  lifetime: { served: number; earned: number; days: number };
  /** Active daily event, or null */
  event: DayEvent | null;
  /** Active toast notifications */
  toasts: Toast[];
  /** Timer for bare shelves warning throttling */
  bareWarnClock: number;
}

/**
 * Action - All possible actions that can modify game state
 * Used by the reducer pattern for predictable state updates
 */
export type Action =
  // Game loop tick with delta time in seconds
  | { type: "TICK"; dt: number }
  // Start a completely new game
  | { type: "NEW_GAME" }
  // Continue from saved state
  | { type: "CONTINUE" }
  // Advance to next day (end current day)
  | { type: "NEXT_DAY" }
  // Open store for business (prep -> playing)
  | { type: "OPEN_STORE" }
  // Accept bankruptcy risk and try another day
  | { type: "TAKE_RISK" }
  // Claim sweepstakes prize
  | { type: "CLAIM_SWEEPSTAKES" }
  // Give up and accept game over
  | { type: "GIVE_UP" }
  // Purchase stock of a specific item
  | { type: "BUY_STOCK"; itemId: string; qty: number }
  // Buy stock of all unlocked items
  | { type: "BUY_ALL"; qty: number; onlyEmpty: boolean }
  // Automatically assign products to empty shelves
  | { type: "AUTO_STOCK_SHELVES" }
  // Set the shelf price for an item
  | { type: "SET_PRICE"; itemId: string; price: number }
  // Place a new shelf in a slot
  | { type: "PLACE_SHELF"; slot: number }
  // Assign an item to a shelf (or clear it)
  | { type: "ASSIGN_SHELF"; shelfId: number; itemId: string | null }
  // Manually restock a shelf from storage
  | { type: "RESTOCK_SHELF"; shelfId: number }
  // Purchase an additional floor slot
  | { type: "BUY_SLOT" }
  // Hire a staff member
  | { type: "HIRE"; kind: "cashier" | "stocker" }
  // Purchase an upgrade
  | { type: "UPGRADE"; kind: "speed" | "capacity" | "marketing" | "register" | "manualCarry" }
  // Unlock a new product for sale
  | { type: "UNLOCK_ITEM"; itemId: string }
  // Start serving next customer in queue manually
  | { type: "SERVE_NEXT" }
  // Scan an item at POS
  | { type: "POS_SCAN"; itemId: string }
  // Give change denomination to customer
  | { type: "POS_GIVE"; denom: number }
  // Hand over all change given so far
  | { type: "POS_HAND" }
  // Cancel current POS transaction
  | { type: "POS_ABORT" }
  // Toggle manual/auto checkout mode
  | { type: "TOGGLE_MANUAL" }
  // Pause/unpause the game
  | { type: "TOGGLE_PAUSE" }
  // Mute/unmute sound
  | { type: "TOGGLE_MUTE" }
  // Enable/disable debug mode
  | { type: "TOGGLE_DEBUG" }
  // Dismiss a toast notification
  | { type: "TOAST_OUT"; id: number }
  // Continue playing after victory (endless mode)
  | { type: "KEEP_PLAYING" };
