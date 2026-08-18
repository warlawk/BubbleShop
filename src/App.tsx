import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { clearSave, hasSave, reducer, initGame } from "./game/reducer";
import { SAVE_KEY, fmt, fmt0 } from "./game/data";
import { setMuted, sfx } from "./game/audio";
import type { Action } from "./game/types";
import { TopBar } from "./components/TopBar";
import { DoorSign } from "./components/DoorSign";
import { StoreFloor } from "./components/StoreFloor";
import { MarketPanel } from "./components/MarketPanel";
import { UpgradesPanel } from "./components/UpgradesPanel";
import { CheckoutPanel } from "./components/CheckoutPanel";
import { POSGame } from "./components/POSGame";
import { BankruptWarning, DaySummary, GameOver, PauseScreen, StartScreen, Sweepstakes, Victory } from "./components/Modals";

/** Tab identifier for the main navigation panels */
type Tab = "floor" | "market" | "upgrades";

/**
 * AbandonButton - Confirmation button to reset game progress
 * 
 * Implements a 2.5-second armed state to prevent accidental game resets.
 * Shows warning style when armed, normal style otherwise.
 */
function AbandonButton({ dispatch }: { dispatch: (a: Action) => void }) {
  const [armed, setArmed] = useState(false);
  
  // Auto-disarm after 2.5 seconds if no second click
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  
  return (
    <button
      className={`bb w-full mt-3 py-1.5 text-xs ${armed ? "bb-red anim-pulse-big" : "bb-slate"}`}
      onClick={() => {
        if (armed) {
          // Second click confirmed - reset game
          clearSave();
          sfx.click();
          dispatch({ type: "NEW_GAME" });
        } else {
          // First click - arm the button
          sfx.click();
          setArmed(true);
        }
      }}
    >
      {armed ? "⚠️ Click again to confirm!" : "🗑️ Abandon store & restart"}
    </button>
  );
}


/** Main navigation tabs configuration */
const TABS: { id: Tab; label: string }[] = [
  { id: "floor", label: "🏪 Store Floor" },
  { id: "market", label: "📦 Wholesale" },
  { id: "upgrades", label: "⬆️ Upgrades" },
];

/**
 * App - Root component for Bubble Mart Tycoon
 * 
 * Manages the entire game state via useReducer, handles:
 * - Game loop (TICK actions every 250ms)
 * - Pause/unpause via keyboard (P/Space)
 * - Auto-save to localStorage every ~1.2s
 * - Sound effects triggered by game events
 * - Toast notification timers
 * - Tab navigation between floor/market/upgrades
 * - Modal overlays for game states (start, summary, gameover, etc.)
 */
export default function App() {
  /** Game state and dispatcher from the reducer */
  const [s, dispatch] = useReducer(reducer, undefined, initGame);
  /** Currently selected tab for main navigation */
  const [tab, setTab] = useState<Tab>("floor");
  /** Whether a saved game exists (for start screen) */
  const saveExists = useMemo(() => hasSave(), []);

  /* ---- game loop ---- */
  /** Dispatches TICK action every 250ms (4 ticks per second) */
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: "TICK", dt: 0.25 }), 250);
    return () => clearInterval(t);
  }, []);

  /* ---- pause hotkeys (P / Space) ---- */
  /** Handles keyboard input for pausing the game */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
      // Don't pause when typing in form elements
      if (e.code === "Space" && ["BUTTON", "INPUT", "TEXTAREA", "SELECT", "A"].includes(tag)) return;
      if (e.code === "Space" || e.code === "KeyP") {
        e.preventDefault();
        dispatch({ type: "TOGGLE_PAUSE" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  /* ---- mute sync ---- */
  /** Syncs muted state with audio system */
  useEffect(() => { setMuted(s.muted); }, [s.muted]);

  /* ---- autosave ---- */
  /** Tracks last save time to throttle localStorage writes */
  const lastSave = useRef(0);
  /** Auto-saves game state every ~1.2 seconds or on phase changes */
  useEffect(() => {
    if (s.phase === "start") return;
    const now = Date.now();
    if (now - lastSave.current > 1200 || s.phase === "summary" || s.phase === "gameover" || s.phase === "bankrupt") {
      lastSave.current = now;
      try {
        // Exclude transient UI state (pos, toasts) from save
        localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, pos: null, toasts: [] }));
      } catch { /* storage full/blocked */ }
    }
  }, [s]);

  /* ---- reactive sound effects ---- */
  /** Tracks previous state for detecting changes that trigger SFX */
  const prev = useRef({ served: 0, level: 1, walkouts: 0, phase: s.phase, lastChing: 0 });
  /** Plays sound effects based on game state changes */
  useEffect(() => {
    const p = prev.current;
    const now = Date.now();
    // Play 'ching' on customer served (debounced 300ms)
    if (s.stats.served > p.served && now - p.lastChing > 300) {
      sfx.ching();
      p.lastChing = now;
    }
    // Play level up sound on level increase
    if (s.level > p.level) sfx.levelup();
    // Play error sound on customer walkout
    if (s.stats.walkouts > p.walkouts) sfx.error();
    // Play phase-specific sounds
    if (s.phase !== p.phase) {
      if (s.phase === "summary") sfx.day();
      if (s.phase === "victory") sfx.levelup();
      if (s.phase === "gameover") sfx.error();
      if (s.phase === "bankrupt") sfx.error();
      if (s.phase === "sweepstakes") sfx.levelup();
      if (s.phase === "playing" && p.phase === "start") sfx.pop();
    }
    prev.current = { ...p, served: s.stats.served, level: s.level, walkouts: s.stats.walkouts, phase: s.phase };
  }, [s.stats.served, s.level, s.stats.walkouts, s.phase, s]);

  /* ---- toast timers ---- */
  /** Tracks which toasts have been scheduled for auto-dismissal */
  const timedToasts = useRef(new Set<number>());
  /** Auto-dismisses toasts after 3.4 seconds */
  useEffect(() => {
    for (const t of s.toasts) {
      if (timedToasts.current.has(t.id)) continue;
      timedToasts.current.add(t.id);
      setTimeout(() => dispatch({ type: "TOAST_OUT", id: t.id }), 3400);
    }
  }, [s.toasts]);

  /** Whether any market items are on flash sale today */
  const flashToday = s.unlocked.some((id) => s.market[id]?.flash);

  return (
    <div className="min-h-screen relative pb-10">
      {/* ambient clouds - decorative background elements */}
      <div className="cloud w-40 h-12" style={{ top: "12%", animationDuration: "75s", animationDelay: "-20s" }} />
      <div className="cloud w-28 h-9" style={{ top: "30%", animationDuration: "95s", animationDelay: "-60s" }} />
      <div className="cloud w-52 h-14" style={{ top: "60%", animationDuration: "110s", animationDelay: "-35s" }} />

      {/* Header bar with cash, day, level, reputation */}
      <TopBar s={s} dispatch={dispatch} />

      {/* Open/Closed toggle sign */}
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4">
        <DoorSign s={s} dispatch={dispatch} />
      </div>

      {/* Main content area - two column layout on large screens */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 mt-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px] items-start">
        {/* left column - main gameplay panels */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Tab navigation for floor/market/upgrades */}
          <nav className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  className={`relative font-display px-5 py-2.5 rounded-full border-[3px] border-ink transition-all ${active ? "text-white shadow-[0_5px_0_rgba(27,42,94,.45)]" : "bg-white/90 text-ink-soft shadow-[0_4px_0_rgba(27,42,94,.25)] hover:-translate-y-0.5"}`}
                  style={active ? { background: "linear-gradient(180deg,#ffc46b,#ff8a00)", textShadow: "0 2px 0 rgba(0,0,0,.3)" } : undefined}
                  onClick={() => { sfx.click(); setTab(t.id); }}
                >
                  {t.label}
                  {/* Flash sale indicator on market tab */}
                  {t.id === "market" && flashToday && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-300 border-2 border-ink flex items-center justify-center text-[10px] font-black anim-wobble">⚡</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Active panel content with slide animation on tab change */}
          <div key={tab} className="anim-slide min-w-0">
            {tab === "floor" && <StoreFloor s={s} dispatch={dispatch} />}
            {tab === "market" && <MarketPanel s={s} dispatch={dispatch} />}
            {tab === "upgrades" && <UpgradesPanel s={s} dispatch={dispatch} />}
          </div>
        </div>

        {/* right column - checkout and info panels (sticky on large screens) */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-[86px]">
          {/* POS checkout management panel */}
          <CheckoutPanel s={s} dispatch={dispatch} />

          {/* Daily event display */}
          <section className="panel p-4">
            <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#ff9ecb,#f0438c)" }}>Today in Town</h2>
            {s.event ? (
              // Special event active
              <div className="mt-2 flex items-center gap-3 bg-[#ffe3ee] border-[3px] border-ink rounded-2xl px-3 py-2.5 anim-pop shadow-[0_4px_0_rgba(27,42,94,.15)]">
                <span className="w-12 h-12 shrink-0 rounded-full bg-white border-[3px] border-ink flex items-center justify-center text-[26px] shadow-[inset_0_-3px_0_rgba(27,42,94,.12)] anim-bob">
                  {s.event.emoji}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-sm leading-tight">{s.event.name}</div>
                  <p className="text-[11px] font-bold text-ink leading-snug">{s.event.desc}</p>
                  <p className="text-[10px] font-black text-ink/60 mt-0.5">
                    Foot traffic ×{s.event.traffic.toFixed(2)}
                    {Object.keys(s.event.demand).length > 0 && " · some products in high demand!"}
                    {s.event.bigCarts && " · bigger carts!"}
                  </p>
                </div>
              </div>
            ) : (
              // Normal day message
              <div className="mt-2 flex items-center gap-3 bg-[#e3f4ff] border-[3px] border-ink rounded-2xl px-3 py-2.5 shadow-[0_4px_0_rgba(27,42,94,.12)]">
                <span className="w-12 h-12 shrink-0 rounded-full bg-white border-[3px] border-ink flex items-center justify-center text-[26px] shadow-[inset_0_-3px_0_rgba(27,42,94,.12)]">
                  ☁️
                </span>
                <p className="text-[11px] font-bold text-ink leading-snug">
                  A regular day on Main Street. Prices shift every morning — check the market!
                </p>
              </div>
            )}
          </section>

          {/* Career statistics panel */}
          <section className="panel p-4">
            <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#c9a6ff,#8b48e8)" }}>Career</h2>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl py-2">
                <div className="font-display text-lg text-[#b8860b]">{s.lifetime.days}</div>
                <div className="text-[9px] font-black uppercase tracking-wide text-ink-soft">days open</div>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl py-2">
                <div className="font-display text-lg text-emerald-700">{s.lifetime.served}</div>
                <div className="text-[9px] font-black uppercase tracking-wide text-ink-soft">served</div>
              </div>
              <div className="bg-sky-50 border-2 border-sky-200 rounded-xl py-2">
                <div className="font-display text-base text-sky-700 tabular-nums">{fmt0(s.lifetime.earned)}</div>
                <div className="text-[9px] font-black uppercase tracking-wide text-ink-soft">earned</div>
              </div>
            </div>
            <AbandonButton dispatch={dispatch} />
          </section>
        </div>
      </main>

      {/* Footer with game title */}
      <footer className="relative z-10 text-center mt-6 text-[11px] font-black text-ink/50">
        Bubble Mart Tycoon — buy low, shelf it, ring it up 🛒
      </footer>

      {/* Toast notifications - positioned fixed top-right */}
      <div className="fixed top-[84px] right-3 z-[70] flex flex-col gap-2 items-end pointer-events-none">
        {s.toasts.map((t) => (
          <div
            key={t.id}
            className={`anim-pop max-w-[300px] px-4 py-2 rounded-full border-[3px] border-ink text-xs font-black text-white shadow-[0_4px_0_rgba(27,42,94,.4)] ${t.kind === "good" ? "bg-gradient-to-b from-[#8ce68f] to-[#2eb84c]" : t.kind === "bad" ? "bg-gradient-to-b from-[#ff8f98] to-[#e8323f]" : "bg-gradient-to-b from-[#6cc4ff] to-[#1f86e8]"}`}
            style={{ textShadow: "0 1px 0 rgba(0,0,0,.3)" }}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Modal overlays - conditional rendering based on game phase */}
      {/* POS minigame overlay during checkout */}
      {s.pos && s.phase === "playing" && <POSGame pos={s.pos} dispatch={dispatch} />}
      {/* Pause screen overlay */}
      {s.paused && s.phase === "playing" && <PauseScreen s={s} dispatch={dispatch} />}
      {/* Start screen on first load */}
      {s.phase === "start" && <StartScreen hasSave={saveExists} dispatch={dispatch} />}
      {/* End of day summary modal */}
      {s.phase === "summary" && <DaySummary s={s} dispatch={dispatch} />}
      {/* Bankruptcy warning modal */}
      {s.phase === "bankrupt" && <BankruptWarning s={s} dispatch={dispatch} />}
      {/* Game over modal */}
      {s.phase === "gameover" && <GameOver s={s} dispatch={dispatch} />}
      {/* Sweepstakes win modal */}
      {s.phase === "sweepstakes" && <Sweepstakes dispatch={dispatch} />}
      {/* Victory modal (end game win) */}
      {s.phase === "victory" && <Victory s={s} dispatch={dispatch} />}
    </div>
  );
}
