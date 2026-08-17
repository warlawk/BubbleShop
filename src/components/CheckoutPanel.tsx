import type { Dispatch } from "react";
import type { Action, GameState } from "../game/types";
import { fmt, queueCap, round2 } from "../game/data";
import { sfx } from "../game/audio";
import { Avatar, IconPerson, IconRegister, PatienceRing } from "./bits";

export function CheckoutPanel({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const cap = queueCap(s.registers);
  const lineFull = s.queue.length >= cap;

  const custTotal = (cart: { itemId: string; qty: number }[]) =>
    round2(cart.reduce((a, l) => a + l.qty * (s.prices[l.itemId] ?? 0), 0));

  return (
    <section className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#8ce68f,#2eb84c)" }}>
          Checkout Lane
        </h2>
        <div className="flex items-center gap-1 text-ink" title={`${s.registers} register(s)`}>
          {Array.from({ length: s.registers }).map((_, i) => (
            <span key={i} className="bg-white border-2 border-ink rounded-lg p-1 shadow-[0_2px_0_rgba(27,42,94,.3)]">
              <IconRegister size={16} />
            </span>
          ))}
        </div>
      </div>

      {/* who works the till */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-full border-[3px] border-ink overflow-hidden shadow-[0_3px_0_rgba(27,42,94,.3)]">
          <button
            className={`px-3 py-1.5 font-display text-xs transition-colors ${s.manualMode ? "text-white" : "bg-white text-ink-soft hover:bg-sky-50"}`}
            style={s.manualMode ? { background: "linear-gradient(180deg,#6cc4ff,#1f86e8)" } : undefined}
            onClick={() => { sfx.click(); dispatch({ type: "TOGGLE_MANUAL" }); }}
          >
            🙋 I ring it
          </button>
          <button
            className={`px-3 py-1.5 font-display text-xs transition-colors ${!s.manualMode ? "text-white" : "bg-white text-ink-soft hover:bg-sky-50"}`}
            style={!s.manualMode ? { background: "linear-gradient(180deg,#8ce68f,#2eb84c)" } : undefined}
            onClick={() => { sfx.click(); dispatch({ type: "TOGGLE_MANUAL" }); }}
          >
            🧑‍💼 Staff rings it
          </button>
        </div>
        <p className="text-[11px] font-bold text-ink-soft leading-tight">
          {s.manualMode
            ? "You work the POS minigame — fast hands earn tips!"
            : s.cashiers > 0
              ? "Cashiers auto-serve the line."
              : "Hire a cashier to auto-serve!"}
        </p>
      </div>

      {/* auto-lane progress */}
      {s.cashiers > 0 && (
        <div className="flex items-center gap-2 bg-emerald-50 border-2 border-ink/20 rounded-2xl px-3 py-2">
          <Avatar hue={210} size={30} />
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
              {Math.min(s.cashiers, s.registers)} cashier{Math.min(s.cashiers, s.registers) > 1 ? "s" : ""} ringing…
            </div>
            <div className="track h-3 mt-0.5">
              <div className="fill fill-green" style={{ width: `${Math.min(100, s.autoAcc * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* the line */}
      <div className="min-h-[104px] rounded-2xl border-[3px] border-dashed border-ink/30 bg-sky-50/60 p-2">
        {s.queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-ink-soft gap-1 py-4">
            <IconPerson size={26} className="opacity-50" />
            <p className="text-xs font-extrabold">No line — enjoy the quiet!</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 items-start">
            {s.queue.map((c, i) => {
              const units = c.cart.reduce((a, l) => a + l.qty, 0);
              return (
                <div key={c.id} className="anim-pop flex flex-col items-center gap-1" title={`${c.name} — ${units} items, ${fmt(custTotal(c.cart))}`}>
                  <div className="relative">
                    <PatienceRing patience={c.patience} size={58} />
                    <Avatar hue={c.hue} size={44} mood={c.patience > 0.5 ? "happy" : c.patience > 0.25 ? "meh" : "angry"} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black bg-white border-2 border-ink rounded-full px-1.5 leading-4">{units}🧺</span>
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border-2 border-emerald-600/50 rounded-full px-1.5 leading-4 tabular-nums">{fmt(custTotal(c.cart))}</span>
                  </div>
                  {i === 0 && <span className="text-[9px] font-black uppercase tracking-wider text-sky-700">up next</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {lineFull && (
        <div className="text-[11px] font-black text-red-700 bg-red-100 border-2 border-red-400 rounded-xl px-2 py-1 anim-pop">
          🚨 Line is out the door! New arrivals are leaving. Add a register.
        </div>
      )}

      <button
        className={`bb bb-green w-full py-3 text-lg ${s.manualMode && s.queue.length > 0 ? "anim-pulse-big anim-ring" : ""}`}
        disabled={s.queue.length === 0}
        onClick={() => { sfx.pop(); dispatch({ type: "SERVE_NEXT" }); }}
      >
        🧾 Open the register
      </button>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl py-1">
          <div className="font-display text-emerald-700">{s.stats.served}</div>
          <div className="text-[9px] font-black uppercase tracking-wide text-emerald-600">served</div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl py-1">
          <div className="font-display text-red-600">{s.stats.walkouts}</div>
          <div className="text-[9px] font-black uppercase tracking-wide text-red-400">walkouts</div>
        </div>
        <div className="bg-sky-50 border-2 border-sky-200 rounded-xl py-1">
          <div className="font-display text-sky-700 text-sm tabular-nums">{fmt(s.stats.revenue + s.stats.tips)}</div>
          <div className="text-[9px] font-black uppercase tracking-wide text-sky-500">today</div>
        </div>
      </div>
    </section>
  );
}
