import { useEffect, type Dispatch } from "react";
import type { Action, POSState } from "../game/types";
import { CHANGE_DENOMS, fmt, itemById, round2 } from "../game/data";
import { sfx } from "../game/audio";
import { Avatar, Barcode, IconCheck, ItemChip } from "./bits";

/**
 * POSGame - Point-of-sale checkout mini-game modal
 * Handles scanning items and giving correct change under time pressure
 * @param pos - Current POS state including customer, cart, and timer info
 * @param dispatch - Redux-style dispatch function for game actions
 */
export function POSGame({ pos, dispatch }: { pos: POSState; dispatch: Dispatch<Action> }) {
  // Handle Escape key to abort POS interaction
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "POS_ABORT" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  const timePct = (pos.time / pos.maxTime) * 100;
  const due = round2(pos.tendered - pos.total);
  const remaining = round2(due - pos.given);
  const scanned = pos.lines.reduce((a, l) => a + (l.qty - l.left), 0);
  const units = pos.lines.reduce((a, l) => a + l.qty, 0);
  const scannedValue = pos.lines.reduce((a, l) => a + (l.qty - l.left) * l.price, 0);

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-3 overflow-y-auto">
      <div
        key={pos.flashT}
        className={`panel w-full max-w-3xl my-6 overflow-hidden ${pos.flashT > 0 ? "anim-shake anim-flash-bad" : "anim-pop"}`}
      >
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b-[3px] border-ink"
          style={{ background: "linear-gradient(180deg,#6cc4ff,#1f86e8)" }}>
          <Avatar hue={pos.hue} size={40} mood={timePct > 30 ? "happy" : "meh"} />
          <div className="text-white">
            <div className="font-display text-lg leading-tight text-outline">{pos.custName}</div>
            <div className="text-[11px] font-black opacity-90">
              {pos.stage === "scan" ? `Ring up their ${units} item${units > 1 ? "s" : ""}!` : "Now hand back the right change!"}
            </div>
          </div>
          <div className="ml-auto flex-1 max-w-[220px]">
            <div className="text-[10px] font-black text-white text-right mb-0.5 tabular-nums">⏱ {pos.time.toFixed(1)}s</div>
            <div className="track h-4 bg-white/40">
              <div className={`fill ${timePct > 50 ? "fill-green" : timePct > 25 ? "fill-sun" : "fill-red"}`} style={{ width: `${Math.max(0, timePct)}%` }} />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[240px_1fr] gap-4 p-4">
          {/* receipt */}
          <div className="bg-amber-50 border-[3px] border-ink rounded-2xl p-3 self-start shadow-[0_4px_0_rgba(27,42,94,.2)]">
            <div className="text-center font-display text-sm tracking-widest border-b-2 border-dashed border-ink/40 pb-1 mb-2">
              BUBBLE MART
            </div>
            <div className="flex flex-col gap-1">
              {pos.lines.map((l) => {
                const def = itemById(l.itemId);
                const done = l.left === 0;
                return (
                  <div key={l.itemId} className={`flex items-center gap-1.5 text-xs font-extrabold ${done ? "opacity-50" : ""}`}>
                    {done ? <IconCheck size={13} className="text-emerald-600 shrink-0" /> : <span className="w-[13px] shrink-0 text-center font-black text-sky-600">{l.left}</span>}
                    <span className={done ? "line-through" : ""}>{l.qty}× {def.name}</span>
                    <span className="ml-auto tabular-nums">{fmt(l.qty * l.price)}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t-2 border-dashed border-ink/40 mt-2 pt-1.5 flex items-center justify-between font-display">
              <span>{pos.stage === "scan" ? `SCANNED ${scanned}/${units}` : "TOTAL"}</span>
              <span className="tabular-nums">{fmt(pos.stage === "scan" ? scannedValue : pos.total)}</span>
            </div>
          </div>

          {/* interaction zone */}
          {pos.stage === "scan" ? (
            <div>
              <p className="text-xs font-black text-ink-soft mb-2">
                🖱️ Tap each item in the cart to scan it — that's it!
              </p>
              <div className="flex flex-col gap-2.5">
                {pos.lines.map((l) => {
                  const def = itemById(l.itemId);
                  const done = l.left === 0;
                  return (
                    <button
                      key={l.itemId}
                      disabled={done}
                      className={`gchip flex items-center gap-3 px-3 py-2.5 text-left transition-all ${done ? "opacity-45 saturate-50 cursor-default" : "hover:-translate-y-0.5 active:translate-y-0.5"}`}
                      style={{
                        backgroundImage: `linear-gradient(180deg, ${def.grad[0]}, ${def.grad[1]})`,
                      }}
                      onClick={() => {
                        if (done) return;
                        sfx.scan();
                        dispatch({ type: "POS_SCAN", itemId: l.itemId });
                      }}
                    >
                      <ItemChip id={l.itemId} size="md" />
                      <div className="flex-1 leading-tight">
                        <div className="text-sm">{def.name}</div>
                        <div className="text-[10px] font-black opacity-85 tabular-nums">{fmt(l.price)} each</div>
                      </div>
                      <span
                        className="barcode-wrap hidden sm:block w-24 h-9 shrink-0 border-2 border-ink/40 shadow-[0_2px_0_rgba(27,42,94,.35)]"
                        title="Scan me!"
                      >
                        <Barcode seed={l.itemId} className="w-full h-full block" />
                        <span className="scanline" />
                      </span>
                      {done ? (
                        <span className="w-9 h-9 rounded-full bg-white/85 border-[3px] border-ink flex items-center justify-center text-emerald-600">
                          <IconCheck size={18} />
                        </span>
                      ) : (
                        <span className="font-display text-lg bg-ink/25 rounded-full px-3 py-1 tabular-nums">
                          ×{l.left}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] font-black text-ink-soft mt-2">
                One tap scans one unit — a 3-pack takes three taps.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-emerald-100 border-[3px] border-emerald-600 rounded-2xl px-3 py-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-700">Customer hands you</span>
                  <span className="font-display text-xl text-emerald-800 tabular-nums">{fmt(pos.tendered)}</span>
                </div>
                <div className="flex items-center gap-2 bg-sky-100 border-[3px] border-sky-500 rounded-2xl px-3 py-1.5">
                  <span className="text-[10px] font-black uppercase text-sky-700">Change due</span>
                  <span className="font-display text-xl text-sky-800 tabular-nums">{fmt(due)}</span>
                </div>
                <div className={`flex items-center gap-2 border-[3px] rounded-2xl px-3 py-1.5 ml-auto ${remaining === 0 ? "bg-emerald-200 border-emerald-600" : "bg-orange-50 border-orange-300"}`}>
                  <span className="text-[10px] font-black uppercase text-ink-soft">Still owe</span>
                  <span className={`font-display text-xl tabular-nums ${remaining === 0 ? "text-emerald-800" : "text-orange-700"}`}>{fmt(remaining)}</span>
                </div>
              </div>

              <p className="text-xs font-black text-ink-soft mb-2">💵 Tap bills & coins to build the change:</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {CHANGE_DENOMS.map((d) => (
                  <button
                    key={d}
                    className={`bb ${d === 0.5 ? "bb-yellow" : "bb-green"} min-w-[74px] py-2.5 text-base`}
                    onClick={() => {
                      if (round2(pos.given + d) > due + 1e-9) sfx.error(); else sfx.coin();
                      dispatch({ type: "POS_GIVE", denom: d });
                    }}
                  >
                    {d < 1 ? (d === 0.25 ? "25¢" : "50¢") : `$${d}`}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-white border-[3px] border-ink rounded-2xl px-3 py-1.5">
                  <span className="text-[10px] font-black uppercase text-ink-soft mr-1.5">In your hand:</span>
                  <span className="font-display text-lg tabular-nums">{fmt(pos.given)}</span>
                </div>
                <button
                  className="bb bb-slate py-2 px-4 text-sm"
                  disabled={pos.given <= 0}
                  onClick={() => { sfx.click(); dispatch({ type: "POS_GIVE", denom: -pos.given }); }}
                >
                  Take back
                </button>
                <button
                  className={`bb bb-green flex-1 min-w-[190px] py-3 text-lg ${remaining === 0 ? "anim-pulse-big" : ""}`}
                  disabled={pos.given <= 0}
                  onClick={() => {
                    if (Math.abs(remaining) < 0.001) sfx.ching(); else sfx.error();
                    dispatch({ type: "POS_HAND" });
                  }}
                >
                  💸 Hand over change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-sky-50 border-t-[3px] border-ink">
          {pos.lastMsg ? (
            <span className="text-xs font-black text-red-600 anim-pop">{pos.lastMsg} (−time!)</span>
          ) : (
            <span className="text-[11px] font-black text-ink-soft">⏸ Store time is frozen while the register is open</span>
          )}
          <button className="bb bb-slate ml-auto py-1.5 px-4 text-xs" onClick={() => { sfx.click(); dispatch({ type: "POS_ABORT" }); }}>
            Step away (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
