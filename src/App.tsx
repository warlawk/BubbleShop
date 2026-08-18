/**
 * Main Application Component - Bubble Mart Tycoon
 * Manages game state, rendering, and user interactions
 * Includes game loop, save system, sound effects, and all UI components
 */

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

/** Type for navigation tabs in the main UI */
type Tab = "floor" | "market" | "upgrades";

/**
 * AbandonButton - Button to reset the game with confirmation safety
 * Requires two clicks within 2.5 seconds to prevent accidental restarts
 */
function AbandonButton({ dispatch }: { dispatch: (a: Action) => void }) {
  const [armed, setArmed] = useState(false);
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
          clearSave();
          sfx.click();
          dispatch({ type: "NEW_GAME" });
        } else {
          sfx.click();
          setArmed(true);
        }
      }}
    >
      {armed ? "⚠️ Click again to confirm!" : "🗑️ Abandon store & restart"}
    </button>
  );
}


/** Navigation tabs configuration with labels and icons */
const TABS: { id: Tab; label: string }[] = [
  { id: "floor", label: "🏪 Store Floor" },
  { id: "market", label: "📦 Wholesale" },
  { id: "upgrades", label: "⬆️ Upgrades" },
];

/**
 * Main App component - the root of the Bubble Mart Tycoon application
 * Manages game state via useReducer, handles game loop, saves, sounds, and renders all UI
 */
export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, initGame);
  const [tab, setTab] = useState<Tab>("floor");
  const saveExists = useMemo(() => hasSave(), []);

  /* ---- game loop ---- */
  useEffect(() => {
    const t = setInterval(() => dispatch({ type: "TICK", dt: 0.25 }), 250);
    return () => clearInterval(t);
  }, []);

  /* ---- pause hotkeys (P / Space) ---- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? "";
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
  useEffect(() => { setMuted(s.muted); }, [s.muted]);

  /* ---- autosave every 1.2s or on phase changes ---- */
  const lastSave = useRef(0);
  useEffect(() => {
    if (s.phase === "start") return;
    const now = Date.now();
    if (now - lastSave.current > 1200 || s.phase === "summary" || s.phase === "gameover" || s.phase === "bankrupt") {
      lastSave.current = now;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, pos: null, toasts: [] }));
      } catch { /* storage full/blocked */ }
    }
  }, [s]);

  /* ---- reactive sound effects based on game events ---- */
  const prev = useRef({ served: 0, level: 1, walkouts: 0, phase: s.phase, lastChing: 0 });
  useEffect(() => {
    const p = prev.current;
    const now = Date.now();
    if (s.stats.served > p.served && now - p.lastChing > 300) {
      sfx.ching();
      p.lastChing = now;
    }
    if (s.level > p.level) sfx.levelup();
    if (s.stats.walkouts > p.walkouts) sfx.error();
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

  /* ---- toast timers - auto-dismiss after 3.4 seconds ---- */
  const timedToasts = useRef(new Set<number>());
  useEffect(() => {
    for (const t of s.toasts) {
      if (timedToasts.current.has(t.id)) continue;
      timedToasts.current.add(t.id);
      setTimeout(() => dispatch({ type: "TOAST_OUT", id: t.id }), 3400);
    }
  }, [s.toasts]);

  const flashToday = s.unlocked.some((id) => s.market[id]?.flash);

  return (
    <div className="min-h-screen relative pb-10">
      {/* ambient clouds */}
      <div className="cloud w-40 h-12" style={{ top: "12%", animationDuration: "75s", animationDelay: "-20s" }} />
      <div className="cloud w-28 h-9" style={{ top: "30%", animationDuration: "95s", animationDelay: "-60s" }} />
      <div className="cloud w-52 h-14" style={{ top: "60%", animationDuration: "110s", animationDelay: "-35s" }} />

      <TopBar s={s} dispatch={dispatch} />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4">
        <DoorSign s={s} dispatch={dispatch} />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 mt-2 grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px] items-start">
        {/* left column */}
        <div className="flex flex-col gap-3 min-w-0">
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
                  {t.id === "market" && flashToday && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-300 border-2 border-ink flex items-center justify-center text-[10px] font-black anim-wobble">⚡</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div key={tab} className="anim-slide min-w-0">
            {tab === "floor" && <StoreFloor s={s} dispatch={dispatch} />}
            {tab === "market" && <MarketPanel s={s} dispatch={dispatch} />}
            {tab === "upgrades" && <UpgradesPanel s={s} dispatch={dispatch} />}
          </div>
        </div>

        {/* right column */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-[86px]">
          <CheckoutPanel s={s} dispatch={dispatch} />

          <section className="panel p-4">
            <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#ff9ecb,#f0438c)" }}>Today in Town</h2>
            {s.event ? (
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

      <footer className="relative z-10 text-center mt-6 text-[11px] font-black text-ink/50">
        Bubble Mart Tycoon — buy low, shelf it, ring it up 🛒
      </footer>

      {/* toasts */}
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

      {/* overlays */}
      {s.pos && s.phase === "playing" && <POSGame pos={s.pos} dispatch={dispatch} />}
      {s.paused && s.phase === "playing" && <PauseScreen s={s} dispatch={dispatch} />}
      {s.phase === "start" && <StartScreen hasSave={saveExists} dispatch={dispatch} />}
      {s.phase === "summary" && <DaySummary s={s} dispatch={dispatch} />}
      {s.phase === "bankrupt" && <BankruptWarning s={s} dispatch={dispatch} />}
      {s.phase === "gameover" && <GameOver s={s} dispatch={dispatch} />}
      {s.phase === "sweepstakes" && <Sweepstakes dispatch={dispatch} />}
      {s.phase === "victory" && <Victory s={s} dispatch={dispatch} />}
    </div>
  );
}
