import { useState, type Dispatch } from "react";
import type { Action, GameState, Shelf } from "../game/types";
import {
  CARRY, ITEMS, MAX_SLOTS, MIN_PRICE, demandFactor, fmt, itemById, maxPrice,
  shelfCapacity, shelfCost, slotCost,
} from "../game/data";
import { sfx } from "../game/audio";
import { IconLock, IconShelf, ItemChip } from "./bits";

function demandBadge(price: number, retail: number) {
  const r = price / retail;
  if (r < 0.95) return { label: "🔥 hot deal", cls: "bg-red-100 text-red-600 border-red-300" };
  if (r < 1.15) return { label: "👍 fair", cls: "bg-emerald-100 text-emerald-700 border-emerald-300" };
  if (r < 1.45) return { label: "💤 pricey", cls: "bg-orange-100 text-orange-600 border-orange-300" };
  return { label: "☠️ rip-off", cls: "bg-red-200 text-red-800 border-red-400" };
}

function ShelfCard({ s, shelf, dispatch, onPick }: {
  s: GameState; shelf: Shelf; dispatch: Dispatch<Action>; onPick: (id: number) => void;
}) {
  const cap = shelfCapacity(s.capLvl);
  const item = shelf.itemId ? itemById(shelf.itemId) : null;
  const price = shelf.itemId ? s.prices[shelf.itemId] : 0;
  const storage = shelf.itemId ? s.storage[shelf.itemId] ?? 0 : 0;
  const badge = item ? demandBadge(price, item.retail) : null;
  const demand = item ? demandFactor(price, item.retail) : 0;
  const evBoost = item && s.event?.demand[item.id] ? s.event.demand[item.id] : 0;

  return (
    <div className="anim-pop min-w-[112px] bg-white border-[3px] border-ink rounded-[16px] overflow-hidden shadow-[0_5px_0_rgba(27,42,94,.22)] flex flex-col">
      <div className={`h-3 ${item ? "awning" : "awning awning-blue"}`} />
      <div className="p-1.5 flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between gap-1">
          {item ? (
            <ItemChip id={item.id} size="sm" />
          ) : (
            <span className="text-[10px] font-black text-ink-soft italic">empty</span>
          )}
          {badge && <span className={`text-[8px] font-black px-1 py-px rounded-full border ${badge.cls}`}>{badge.label}</span>}
        </div>

        {/* stock bar */}
        <div>
          <div className="flex justify-between text-[9px] font-black text-ink-soft mb-0.5 leading-3">
            <span>STOCK</span>
            <span className="tabular-nums">{shelf.stock}/{cap}</span>
          </div>
          <div className="track h-2.5">
            <div
              className={`fill ${shelf.stock === 0 ? "fill-red" : demand > 1 ? "fill-pink" : "fill-blue"}`}
              style={{ width: `${(shelf.stock / cap) * 100}%` }}
            />
          </div>
        </div>

        {item ? (
          <>
            {/* price stepper */}
            <div className="flex items-center gap-0.5">
              <button
                className="bb bb-red w-6 h-6 text-xs flex items-center justify-center"
                onClick={() => { sfx.click(); dispatch({ type: "SET_PRICE", itemId: item.id, price: price - 0.25 }); }}
                disabled={price <= MIN_PRICE + 1e-9}
                title="Lower price 25¢ (more demand)"
              >−</button>
              <div className="flex-1 text-center font-display text-xs tabular-nums bg-sky-50 border-2 border-ink/20 rounded-lg py-0.5 leading-4">
                {fmt(price)}
              </div>
              <button
                className="bb bb-green w-6 h-6 text-xs flex items-center justify-center"
                onClick={() => { sfx.click(); dispatch({ type: "SET_PRICE", itemId: item.id, price: price + 0.25 }); }}
                disabled={price >= maxPrice(item) - 1e-9}
                title={`Raise price 25¢ (max ${fmt(maxPrice(item))})`}
              >+</button>
            </div>
            {evBoost > 1 && (
              <div className="text-[8px] font-black text-fuchsia-700 bg-fuchsia-100 border border-fuchsia-300 rounded-md px-1 py-px text-center anim-pop leading-3">
                📰 hot ×{evBoost.toFixed(1)}
              </div>
            )}
          </>
        ) : null}

        <div className="mt-auto flex gap-1">
          <button
            className="bb bb-blue flex-1 py-1 text-[10px]"
            onClick={() => { sfx.pop(); dispatch({ type: "RESTOCK_SHELF", shelfId: shelf.id }); }}
            disabled={!item || storage <= 0 || shelf.stock >= cap}
            title={`Carry ${CARRY} units from the back room`}
          >
            +{CARRY} 📦{storage}
          </button>
          <button
            className="bb bb-slate py-1 px-1.5 text-[10px]"
            onClick={() => { sfx.click(); onPick(shelf.id); }}
            title={item ? "Swap product" : "Choose product"}
          >
            {item ? "Swap" : "Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StoreFloor({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const [pickFor, setPickFor] = useState<number | null>(null);
  const totalStock = s.shelves.reduce((a, sh) => a + sh.stock, 0);
  const pickShelf = pickFor != null ? s.shelves.find((sh) => sh.id === pickFor) : null;

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="panel-title">Store Floor</h2>
        <span className="text-xs font-extrabold text-ink-soft">
          {s.shelves.length} shelves · {s.slots}/{MAX_SLOTS} spaces
        </span>
        <div className="ml-auto flex flex-col items-end gap-1 max-w-[60%]">
          {s.event && (
            <div className="candy-stripe border-[3px] border-ink rounded-full px-3 py-1 text-[11px] font-black text-ink anim-pop">
              📰 {s.event.name} <span className="font-bold">{s.event.desc}</span>
            </div>
          )}
          {totalStock < 10 && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 rounded-full px-3 py-1 text-[11px] font-black anim-pop">
              ⚠️ Shelves nearly empty — hit Restock or buy wholesale!
            </div>
          )}
        </div>
      </div>

      {/* two tidy rows of eight spaces */}
      <div className="grid grid-cols-8 gap-2 overflow-x-auto pb-1">
        {Array.from({ length: MAX_SLOTS }).map((_, slot) => {
          const shelf = s.shelves.find((sh) => sh.slot === slot);
          if (slot < s.slots) {
            if (shelf) {
              return <ShelfCard key={slot} s={s} shelf={shelf} dispatch={dispatch} onPick={setPickFor} />;
            }
            const cost = shelfCost(s.shelves.length);
            return (
              <div key={slot} className="min-w-[112px] min-h-[128px] rounded-[16px] border-[3px] border-dashed border-ink/40 bg-white/50 flex flex-col items-center justify-center gap-1.5 p-2">
                <IconShelf size={22} className="text-ink-soft opacity-60" />
                <span className="text-[10px] font-black text-ink-soft">Empty space</span>
                <button
                  className="bb bb-orange py-1 px-2 text-[10px]"
                  disabled={s.cash < cost}
                  onClick={() => { sfx.pop(); dispatch({ type: "PLACE_SHELF", slot }); }}
                >
                  Shelf {fmt(cost)}
                </button>
              </div>
            );
          }
          const cost = slotCost(s.slots);
          return (
            <div key={slot} className="min-w-[112px] min-h-[128px] rounded-[16px] border-[3px] border-dashed border-ink/25 bg-ink/5 flex flex-col items-center justify-center gap-1.5 p-2">
              <IconLock size={20} className="text-ink-soft opacity-50" />
              <span className="text-[9px] font-black text-ink-soft text-center leading-3">Landlord's space</span>
              <button
                className="bb bb-purple py-1 px-2 text-[10px]"
                disabled={s.cash < cost}
                onClick={() => { sfx.pop(); dispatch({ type: "BUY_SLOT" }); }}
                title="Lease another floor space for a shelf"
              >
                Lease {fmt(cost)}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] font-black text-ink-soft/70 lg:hidden">← swipe the floor to see all 16 spaces →</p>

      {/* product picker modal */}
      {pickShelf && (
        <div className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4" onClick={() => setPickFor(null)}>
          <div className="panel p-5 max-w-md w-full anim-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-xl mb-1">Stock this shelf</h3>
            <p className="text-xs font-bold text-ink-soft mb-3">Pick a product. You'll restock it from the back room.</p>
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
              {s.unlocked.map((id) => {
                const def = itemById(id);
                const n = s.storage[id] ?? 0;
                const active = pickShelf.itemId === id;
                return (
                  <button
                    key={id}
                    className={`flex items-center gap-3 border-[3px] rounded-2xl px-3 py-2 text-left transition-all hover:-translate-y-0.5 ${active ? "border-emerald-500 bg-emerald-50" : "border-ink/25 bg-white hover:border-ink"}`}
                    onClick={() => { sfx.pop(); dispatch({ type: "ASSIGN_SHELF", shelfId: pickShelf.id, itemId: id }); setPickFor(null); }}
                  >
                    <ItemChip id={id} size="md" />
                    <div className="flex-1">
                      <div className="text-sm font-extrabold">{def.name}</div>
                      <div className="text-[10px] font-black text-ink-soft">{def.tag} · sells ~{fmt(def.retail)}</div>
                    </div>
                    <span className="text-[10px] font-black bg-sky-100 border-2 border-sky-300 text-sky-700 rounded-full px-2 py-0.5">📦 {n}</span>
                  </button>
                );
              })}
              {ITEMS.filter((i) => !s.unlocked.includes(i.id)).map((def) => (
                <div key={def.id} className="flex items-center gap-3 border-[3px] border-dashed border-ink/20 rounded-2xl px-3 py-2 opacity-50">
                  <ItemChip id={def.id} size="md" />
                  <div className="flex-1">
                    <div className="text-sm font-extrabold">{def.name}</div>
                    <div className="text-[10px] font-black text-ink-soft">Locked — unlock in Upgrades</div>
                  </div>
                  <IconLock size={16} className="text-ink-soft" />
                </div>
              ))}
            </div>
            {pickShelf.itemId && (
              <button
                className="bb bb-red w-full mt-3 py-2 text-sm"
                onClick={() => { sfx.click(); dispatch({ type: "ASSIGN_SHELF", shelfId: pickShelf.id, itemId: null }); setPickFor(null); }}
              >
                Clear shelf
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
