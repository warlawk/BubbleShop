import type { Dispatch } from "react";
import type { Action, GameState } from "../game/types";
import { ITEMS, effPrice, fmt, round2 } from "../game/data";
import { sfx } from "../game/audio";
import { IconDown, IconLock, IconUp, ItemChip } from "./bits";

/**
 * MarketPanel - Wholesale market interface for buying stock products
 * Shows current market prices, flash deals, and bulk purchase options
 * @param s - Current game state containing market data, storage, and cash
 * @param dispatch - Redux-style dispatch function for game actions
 */
export function MarketPanel({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  /** Purchase stock items, triggering BUY_STOCK action */
  const buy = (itemId: string, qty: number) => {
    if (qty < 1) return;
    sfx.coin();
    dispatch({ type: "BUY_STOCK", itemId, qty });
  };

  const emptyCount = s.unlocked.filter((id) => (s.storage[id] ?? 0) === 0).length;
  const allCost = s.unlocked.reduce(
    (a, id) => a + round2(effPrice(s.market[id].price, s.market[id].flash) * 10), 0);

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#ffc46b,#ff8a00)" }}>
          Wholesale Market
        </h2>
        <p className="text-xs font-extrabold text-ink-soft">
          Prices drift daily around the baseline — buy low, stock the back room 📦
        </p>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            className="bb bb-blue py-1.5 px-3 text-xs"
            onClick={() => { sfx.coin(); dispatch({ type: "BUY_ALL", qty: 10, onlyEmpty: false }); }}
            disabled={s.unlocked.length === 0}
            title={`Buy 10 units of every unlocked product (~${fmt(allCost)})`}
          >
            🚚 Stock everything · +10 each
          </button>
          <button
            className="bb bb-orange py-1.5 px-3 text-xs"
            onClick={() => { sfx.coin(); dispatch({ type: "BUY_ALL", qty: 25, onlyEmpty: true }); }}
            disabled={emptyCount === 0}
            title={`Buy 25 units of each of the ${emptyCount} product(s) that are empty in the back room`}
          >
            🔁 Refill empties{emptyCount > 0 ? ` (${emptyCount})` : ""} · +25 each
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {ITEMS.map((def) => {
          const unlocked = s.unlocked.includes(def.id);
          const m = s.market[def.id];
          const unit = effPrice(m.price, m.flash);
          const inBack = s.storage[def.id] ?? 0;
          const diff = m.price - def.base;
          const maxQty = Math.min(200, Math.floor((s.cash + 1e-9) / unit));

          if (!unlocked) {
            return (
              <div key={def.id} className="flex items-center gap-3 border-[3px] border-dashed border-ink/20 rounded-2xl px-3 py-2 opacity-55">
                <ItemChip id={def.id} size="md" />
                <div className="flex-1">
                  <div className="text-sm font-extrabold">{def.name}</div>
                  <div className="text-[10px] font-black text-ink-soft">Supplier locked — unlock in Upgrades ({fmt(def.unlockCost)} · Lv {def.reqLevel})</div>
                </div>
                <IconLock size={18} className="text-ink-soft" />
              </div>
            );
          }

          return (
            <div key={def.id} className="flex flex-wrap items-center gap-3 bg-gradient-to-b from-white to-sky-50 border-[3px] border-ink rounded-2xl px-3 py-2 shadow-[0_4px_0_rgba(27,42,94,.15)]">
              <ItemChip id={def.id} size="md" className="w-20" />
              <div className="min-w-[110px]">
                <div className="text-sm font-extrabold leading-tight">{def.name}</div>
                <div className="text-[10px] font-black text-ink-soft">
                  {def.tag} · base {fmt(def.base)}
                  <span className="ml-1 inline-flex items-center gap-0.5 align-middle">
                    {diff > 0.004 ? (
                      <span className="text-red-500"><IconUp size={11} className="inline" /> pricey</span>
                    ) : diff < -0.004 ? (
                      <span className="text-emerald-600"><IconDown size={11} className="inline" /> cheap</span>
                    ) : (
                      <span className="text-ink-soft">steady</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <div className={`font-display text-lg tabular-nums leading-none ${m.flash ? "text-pink-600" : diff < -0.004 ? "text-emerald-600" : diff > 0.004 ? "text-red-500" : ""}`}>
                  {fmt(unit)}
                </div>
                {m.flash && (
                  <span className="inline-block mt-0.5 text-[9px] font-black bg-yellow-300 border-2 border-ink rounded-full px-1.5 leading-4 anim-wobble">⚡ −40% TODAY</span>
                )}
              </div>

              <span className="text-[10px] font-black bg-sky-100 border-2 border-sky-300 text-sky-700 rounded-full px-2 py-0.5">📦 {inBack} in back</span>

              <div className="ml-auto flex flex-wrap gap-1.5">
                <button className="bb bb-blue py-1.5 px-3 text-xs" disabled={s.cash < unit * 10 - 1e-9} onClick={() => buy(def.id, 10)}>
                  +10 · {fmt(round2(unit * 10))}
                </button>
                <button className="bb bb-blue py-1.5 px-3 text-xs" disabled={s.cash < unit * 50 - 1e-9} onClick={() => buy(def.id, 50)}>
                  +50 · {fmt(round2(unit * 50))}
                </button>
                <button className="bb bb-orange py-1.5 px-3 text-xs" disabled={maxQty < 1} onClick={() => buy(def.id, maxQty)} title={`Buy ${maxQty} units`}>
                  MAX ×{maxQty}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
