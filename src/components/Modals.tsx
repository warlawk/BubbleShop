import { useMemo, type Dispatch, type ReactNode } from "react";
import type { Action, GameState } from "../game/types";
import { GOAL, fmt, fmt0, round2 } from "../game/data";
import { setMuted, sfx } from "../game/audio";
import { IconPause, IconTrophy, StarRow } from "./bits";

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto bg-gradient-to-b from-[#3aa0f0]/90 via-[#5fb9f5]/92 to-[#9fdcff]/95">
      {children}
    </div>
  );
}

/* ---------------- start screen ---------------- */

export function StartScreen({ hasSave, dispatch }: { hasSave: boolean; dispatch: Dispatch<Action> }) {
  return (
    <Overlay>
      <div className="awning h-9" />
      <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col items-center text-center">
        <div className="anim-bob">
          <h1 className="font-display text-6xl sm:text-7xl text-white text-outline leading-none">BUBBLE</h1>
          <h1 className="font-display text-6xl sm:text-7xl text-[#ffd23f] text-outline leading-[0.95] -mt-1">MART</h1>
        </div>
        <div className="mt-2 px-5 py-1 rounded-full bg-candy border-[3px] border-ink font-display text-white tracking-[0.3em] text-sm shadow-[0_4px_0_rgba(27,42,94,.4)] anim-pop">
          TYCOON
        </div>
        <p className="mt-4 text-white font-extrabold text-lg drop-shadow-[0_2px_0_rgba(27,42,94,.6)]">
          Run the corner store. Prep each morning, flip the sign, ring it up, get rich.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {hasSave ? (
            <>
              <button className="bb bb-green px-10 py-4 text-2xl anim-pulse-big" onClick={() => { sfx.pop(); dispatch({ type: "CONTINUE" }); }}>
                ▶ Keep Playing
              </button>
              <button className="bb bb-red px-6 py-3 text-lg" onClick={() => { sfx.click(); dispatch({ type: "NEW_GAME" }); }}>
                New Game
              </button>
            </>
          ) : (
            <button className="bb bb-green px-12 py-4 text-2xl anim-pulse-big" onClick={() => { sfx.pop(); dispatch({ type: "NEW_GAME" }); }}>
              ▶ Open the Store
            </button>
          )}
        </div>

        <div className="mt-8 grid sm:grid-cols-3 gap-3 w-full">
          {[
            { n: "1", title: "Buy wholesale", body: "Prices drift up & down every day around a baseline. Grab flash deals!", rot: "-rotate-2", bg: "linear-gradient(180deg,#ffc46b,#ff8a00)" },
            { n: "2", title: "Shelf & price it", body: "Restock shelves, set prices, lease floor space, add more products.", rot: "rotate-1", bg: "linear-gradient(180deg,#6cc4ff,#1f86e8)" },
            { n: "3", title: "Flip the sign & sell", body: "Open the doors, scan barcodes & count out change — or hire cashiers to run the lane.", rot: "-rotate-1", bg: "linear-gradient(180deg,#8ce68f,#2eb84c)" },
          ].map((c) => (
            <div key={c.n} className={`${c.rot} bg-white border-[3px] border-ink rounded-[22px] p-4 shadow-[0_7px_0_rgba(27,42,94,.28)] hover:rotate-0 transition-transform`}>
              <div className="w-9 h-9 rounded-full border-[3px] border-ink text-white font-display text-lg flex items-center justify-center mx-auto" style={{ background: c.bg, boxShadow: "inset 0 2px 0 rgba(255,255,255,.5)" }}>
                {c.n}
              </div>
              <h3 className="font-display text-base mt-2">{c.title}</h3>
              <p className="text-xs font-bold text-ink-soft mt-1 leading-snug">{c.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm font-black text-white drop-shadow-[0_2px_0_rgba(27,42,94,.6)] flex items-center gap-2">
          <IconTrophy size={20} className="text-[#ffd23f]" /> Stack {fmt0(GOAL)} in the till to win the Golden Till Award
        </p>
        <p className="mt-1 text-[11px] font-bold text-white/90">Mouse / touch · P or Space pauses · Esc steps away from the register · game autosaves</p>
      </div>
    </Overlay>
  );
}

/* ---------------- pause ---------------- */

export function PauseScreen({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  return (
    <div className="fixed inset-0 z-[65] bg-ink/70 flex items-center justify-center p-4">
      <div className="panel max-w-md w-full overflow-hidden anim-pop">
        <div className="awning h-7" />
        <div className="p-6 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-[3px] border-ink font-display text-2xl text-[#5c3b00] anim-wobble"
            style={{ background: "linear-gradient(180deg,#ffe27a,#ffb400)", boxShadow: "0 4px 0 rgba(27,42,94,.35), inset 0 2px 0 rgba(255,255,255,.6)" }}>
            <IconPause size={22} /> PAUSED
          </div>
          <p className="mt-2 text-xs font-black text-ink-soft">
            Day {s.day} · {fmt(s.cash)} in the till · everyone's frozen mid-shop
          </p>

          <div className="mt-4 bg-sky-50 border-[3px] border-ink/20 rounded-2xl p-3 text-left flex flex-col gap-1.5">
            {[
              ["⏸", "P or Space pauses / resumes anytime"],
              ["🖱️", "At the register, tap barcodes to scan items"],
              ["💵", "Count out exact change — quick & right earns tips"],
              ["📦", "Wholesale prices shift overnight. Buy low!"],
            ].map(([ic, txt]) => (
              <div key={txt} className="flex items-center gap-2 text-xs font-bold text-ink">
                <span className="w-7 h-7 shrink-0 rounded-full bg-white border-2 border-ink flex items-center justify-center text-sm shadow-[0_2px_0_rgba(27,42,94,.25)]">{ic}</span>
                {txt}
              </div>
            ))}
          </div>

          <button className="bb bb-green w-full mt-5 py-3.5 text-xl anim-pulse-big" onClick={() => { sfx.pop(); dispatch({ type: "TOGGLE_PAUSE" }); }}>
            ▶ Back to work!
          </button>
          <button
            className="bb bb-slate w-full mt-2 py-2 text-sm"
            onClick={() => { setMuted(!s.muted); sfx.click(); dispatch({ type: "TOGGLE_MUTE" }); }}
          >
            {s.muted ? "🔇 Sound is off — tap to unmute" : "🔊 Sound is on — tap to mute"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- day summary ---------------- */

export function DaySummary({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const profit = round2(s.stats.revenue + s.stats.tips - s.stats.goods - s.stats.wages - s.stats.rent);
  const row = (label: string, val: string, neg = false) => (
    <div className="flex items-center justify-between text-sm font-extrabold">
      <span className="text-ink-soft">{label}</span>
      <span className={`tabular-nums font-display ${neg ? "text-red-500" : "text-emerald-700"}`}>{val}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[55] bg-ink/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="panel max-w-md w-full p-6 anim-pop my-6">
        <div className="text-center">
          <div className="text-4xl">🌙</div>
          <h2 className="font-display text-3xl mt-1">Day {s.day} closed!</h2>
          <div className="flex justify-center mt-1"><StarRow rep={s.rep} /></div>
          <p className="text-xs font-bold text-ink-soft">Reputation {s.rep.toFixed(1)} / 5</p>
        </div>
        <div className="mt-4 bg-sky-50 border-[3px] border-ink/20 rounded-2xl p-3 flex flex-col gap-1.5">
          {row("Sales", "+" + fmt(s.stats.revenue))}
          {row("Tips", "+" + fmt(s.stats.tips))}
          {row("Wholesale goods", "−" + fmt(s.stats.goods), true)}
          {row("Wages", "−" + fmt(s.stats.wages), true)}
          {row("Rent", "−" + fmt(s.stats.rent), true)}
          <div className="border-t-2 border-dashed border-ink/30 pt-1.5 flex items-center justify-between">
            <span className="font-display">Day profit</span>
            <span className={`font-display text-2xl tabular-nums ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {profit >= 0 ? "+" : "−"}{fmt(Math.abs(profit))}
            </span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-black">
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl py-1.5">🙂 {s.stats.served} served</div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl py-1.5">😤 {s.stats.walkouts} walked out</div>
        </div>
        <button className="bb bb-orange w-full mt-5 py-3.5 text-xl anim-pulse-big" onClick={() => { sfx.day(); dispatch({ type: "NEXT_DAY" }); }}>
          🌅 Prep for Day {s.day + 1}
        </button>
        <p className="text-center text-[10px] font-black text-ink-soft mt-2">Overnight prices are in — restock & plan, then flip the sign to open!</p>
      </div>
    </div>
  );
}

/* ---------------- game over ---------------- */

export function GameOver({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  return (
    <div className="fixed inset-0 z-[55] bg-ink/70 flex items-center justify-center p-4">
      <div className="panel max-w-md w-full p-6 anim-pop text-center" style={{ borderColor: "#e8323f" }}>
        <div className="text-5xl">🏚️</div>
        <h2 className="font-display text-4xl text-red-500 mt-2">BANKRUPT!</h2>
        <p className="text-sm font-bold text-ink-soft mt-2">
          The bills piled up and the bank changed the locks on Day {s.day}. Main Street will miss you… probably.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-black">
          <div className="bg-sky-50 border-2 border-sky-200 rounded-xl py-2">{s.lifetime.days}<br />days</div>
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl py-2">{s.lifetime.served}<br />served</div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl py-2">{fmt0(s.lifetime.earned)}<br />earned</div>
        </div>
        <button className="bb bb-green w-full mt-5 py-3 text-xl" onClick={() => { sfx.pop(); dispatch({ type: "NEW_GAME" }); }}>
          🔄 Try Again
        </button>
      </div>
    </div>
  );
}

/* ---------------- victory ---------------- */

export function Victory({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        dur: 2.6 + Math.random() * 2.6,
        color: ["#e8323f", "#ffd23f", "#2eb84c", "#1f86e8", "#f0438c", "#ff8a00"][i % 6],
      })),
    []
  );
  return (
    <div className="fixed inset-0 z-[55] bg-ink/60 flex items-center justify-center p-4 overflow-hidden">
      {pieces.map((p, i) => (
        <span key={i} className="confetti" style={{ left: `${p.left}vw`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
      ))}
      <div className="panel max-w-md w-full p-6 anim-pop text-center">
        <div className="w-20 h-20 mx-auto rounded-full border-[3px] border-ink flex items-center justify-center anim-wobble"
          style={{ background: "linear-gradient(180deg,#ffe27a,#ffb400)", boxShadow: "0 5px 0 rgba(27,42,94,.4), inset 0 3px 0 rgba(255,255,255,.65)" }}>
          <IconTrophy size={40} className="text-ink" />
        </div>
        <h2 className="font-display text-3xl mt-3 text-[#b8860b]">GOLDEN TILL AWARD</h2>
        <p className="text-sm font-bold text-ink-soft mt-1">
          You stacked {fmt0(GOAL)} in {s.lifetime.days} days, served {s.lifetime.served} neighbors, and turned a tiny corner shop into the pride of Main Street!
        </p>
        <div className="flex gap-2 mt-5">
          <button className="bb bb-green flex-1 py-3 text-lg" onClick={() => { sfx.pop(); dispatch({ type: "KEEP_PLAYING" }); }}>
            🏪 Keep Playing
          </button>
          <button className="bb bb-blue flex-1 py-3 text-lg" onClick={() => { sfx.click(); dispatch({ type: "NEW_GAME" }); }}>
            🔄 New Game
          </button>
        </div>
      </div>
    </div>
  );
}
