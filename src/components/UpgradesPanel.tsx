import type { ReactNode } from "react";
import type { Dispatch } from "react";
import type { Action, GameState } from "../game/types";
import {
  ITEMS, MAX_SLOTS, MAX_STAFF, STAFF_UNLOCK, autoSeconds, dailyWages, fmt,
  hireCost, nextWage, queueCap, shelfCapacity, slotCost, upgradeCost, upgradeMax,
} from "../game/data";
import { sfx } from "../game/audio";
import {
  IconBolt, IconBox, IconCheck, IconLock, IconMegaphone, IconPerson, IconRegister,
  IconShelf, IconWrench, ItemChip,
} from "./bits";

function Pips({ cur, max }: { cur: number; max: number }) {
  const cols = max <= 8 ? max : Math.ceil(max / 2); // balance into at most two rows
  const wrapped = max > 8;
  return (
    <div
      className={wrapped ? "grid gap-1" : "flex gap-1"}
      style={wrapped ? { gridTemplateColumns: `repeat(${cols}, 0.875rem)` } : undefined}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`w-3.5 h-3.5 rounded-full border-2 border-ink ${i < cur ? "" : "bg-white/70"}`}
          style={i < cur ? { background: "linear-gradient(180deg,#8ce68f,#2eb84c)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)" } : undefined}
        />
      ))}
    </div>
  );
}

function Card({ icon, title, desc, pips, cost, maxed, canAfford, extra, onBuy, btnLabel, locked }: {
  icon: ReactNode; title: string; desc: string; pips?: { cur: number; max: number };
  cost?: number; maxed: boolean; canAfford: boolean; extra?: string; onBuy: () => void; btnLabel?: string;
  locked?: string;
}) {
  return (
    <div className={`bg-white border-[3px] rounded-[20px] p-3 flex flex-col gap-1.5 transition-transform ${locked ? "border-dashed border-ink/40 opacity-70" : "border-ink shadow-[0_5px_0_rgba(27,42,94,.18)] hover:-translate-y-0.5"}`}>
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-full border-[3px] border-ink flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(180deg,#6cc4ff,#1f86e8)", color: "#fff", boxShadow: "inset 0 2px 0 rgba(255,255,255,.5)" }}>
          {icon}
        </span>
        <div className="leading-tight">
          <div className="font-display text-sm">{title}</div>
          {pips && <Pips cur={pips.cur} max={pips.max} />}
        </div>
      </div>
      <p className="text-[11px] font-bold text-ink-soft leading-snug">{desc}</p>
      {extra && <p className="text-[10px] font-black text-sky-700 bg-sky-50 border-2 border-sky-200 rounded-lg px-1.5 py-0.5">{extra}</p>}
      {locked ? (
        <div className="mt-auto flex items-center justify-center gap-1.5 py-1.5 rounded-full border-[3px] border-ink/30 bg-slate-100 font-display text-xs text-ink-soft">
          <IconLock size={14} /> {locked}
        </div>
      ) : (
        <button
          className="bb bb-orange mt-auto py-1.5 text-sm"
          disabled={maxed || !canAfford}
          onClick={() => { sfx.pop(); onBuy(); }}
        >
          {maxed ? "MAXED OUT" : `${btnLabel ?? "Buy"} · ${fmt(cost ?? 0)}`}
        </button>
      )}
    </div>
  );
}

export function UpgradesPanel({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const locked = ITEMS.filter((i) => !s.unlocked.includes(i.id)).sort((a, b) => a.unlockCost - b.unlockCost);
  const wages = dailyWages(s.cashiers, s.stockers);
  const headcount = s.cashiers + s.stockers;

  return (
    <section className="panel p-4 flex flex-col gap-4">
      <div>
        <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#c9a6ff,#8b48e8)" }}>Staff</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black text-ink-soft bg-purple-50 border-2 border-purple-200 rounded-full px-2.5 py-0.5">
            💵 Wage ladder: 1st $35/day · 2nd $40 · 3rd $45 · 4th $50 · 5th $55… (cashiers & stockers share it)
          </span>
          {wages > 0 && (
            <span className="text-[11px] font-black text-purple-700 bg-white border-2 border-purple-300 rounded-full px-2.5 py-0.5">
              Payroll now: {fmt(wages)}/day for {headcount} staff
            </span>
          )}
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          <Card
            icon={<IconPerson size={18} />}
            title={`Cashiers · ${s.cashiers}`}
            pips={{ cur: s.cashiers, max: MAX_STAFF }}
            desc="Automatically ring up the line on a timer while you manage the shop or work the register yourself."
            extra={
              s.cashiers === 0
                ? `No cashier yet — you work the register! This hire would work for $${nextWage(headcount)}/day`
                : `${Math.min(s.cashiers, s.registers)} working the lane(s) · next hire works for $${nextWage(headcount)}/day`
            }
            locked={!s.debug && s.level < STAFF_UNLOCK.cashier ? `Unlocks at store Lv ${STAFF_UNLOCK.cashier}` : undefined}
            cost={hireCost("cashier", s.cashiers)} maxed={s.cashiers >= MAX_STAFF} canAfford={s.cash >= hireCost("cashier", s.cashiers)}
            onBuy={() => dispatch({ type: "HIRE", kind: "cashier" })} btnLabel="Hire"
          />
          <Card
            icon={<IconBox size={18} />}
            title={`Stockers · ${s.stockers}`}
            pips={{ cur: s.stockers, max: MAX_STAFF }}
            desc="Haul boxes from the back room onto shelves all day long, so you never run dry mid-rush."
            extra={
              s.stockers === 0
                ? `Right now you restock by hand (+5 per click) · this hire would work for $${nextWage(headcount)}/day`
                : `Shelves refill themselves · next hire works for $${nextWage(headcount)}/day`
            }
            locked={!s.debug && s.level < STAFF_UNLOCK.stocker ? `Unlocks at store Lv ${STAFF_UNLOCK.stocker}` : undefined}
            cost={hireCost("stocker", s.stockers)} maxed={s.stockers >= MAX_STAFF} canAfford={s.cash >= hireCost("stocker", s.stockers)}
            onBuy={() => dispatch({ type: "HIRE", kind: "stocker" })} btnLabel="Hire"
          />
          <Card
            icon={<IconBolt size={18} />}
            title="POS Training"
            pips={{ cur: s.speedLvl, max: upgradeMax("speed") }}
            desc="Cashiers scan 30% faster per level."
            extra={`${autoSeconds(s.speedLvl).toFixed(1)}s → ${autoSeconds(Math.min(s.speedLvl + 1, upgradeMax("speed"))).toFixed(1)}s per customer`}
            locked={!s.debug && s.level < 4 ? "Unlocks at store Lv 4 (with cashiers)" : undefined}
            cost={upgradeCost("speed", s.speedLvl)} maxed={s.speedLvl >= upgradeMax("speed")} canAfford={s.cash >= upgradeCost("speed", s.speedLvl)}
            onBuy={() => dispatch({ type: "UPGRADE", kind: "speed" })} btnLabel="Train"
          />
        </div>
      </div>

      <div>
        <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#ffc46b,#ff8a00)" }}>Store</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          <Card
            icon={<IconRegister size={18} />}
            title={`Registers · ${s.registers}`}
            pips={{ cur: s.registers - 1, max: upgradeMax("register") }}
            desc="Each extra register fits +3 customers in line and adds a cashier lane."
            extra={`Line capacity: ${queueCap(s.registers)} → ${queueCap(Math.min(s.registers + 1, upgradeMax("register") + 1))}`}
            locked={!s.debug && s.level < 4 ? "Unlocks at store Lv 4 (with cashiers)" : undefined}
            cost={upgradeCost("register", s.registers - 1)} maxed={s.registers >= upgradeMax("register") + 1} canAfford={s.cash >= upgradeCost("register", s.registers - 1)}
            onBuy={() => dispatch({ type: "UPGRADE", kind: "register" })}
          />
          <Card
            icon={<IconShelf size={18} />}
            title="Floor Space"
            pips={{ cur: s.slots, max: MAX_SLOTS }}
            desc="Lease another space from the landlord so you can fit one more shelf."
            extra={`${s.slots}/${MAX_SLOTS} spaces leased`}
            cost={slotCost(s.slots)} maxed={s.slots >= MAX_SLOTS} canAfford={s.cash >= slotCost(s.slots)}
            onBuy={() => dispatch({ type: "BUY_SLOT" })} btnLabel="Lease"
          />
          <Card
            icon={<IconWrench size={18} />}
            title="Shelf Capacity"
            pips={{ cur: s.capLvl, max: upgradeMax("capacity") }}
            desc="Deeper shelves: every shelf holds +5 units."
            extra={`${shelfCapacity(s.capLvl)} → ${shelfCapacity(Math.min(s.capLvl + 1, upgradeMax("capacity")))} per shelf`}
            cost={upgradeCost("capacity", s.capLvl)} maxed={s.capLvl >= upgradeMax("capacity")} canAfford={s.cash >= upgradeCost("capacity", s.capLvl)}
            onBuy={() => dispatch({ type: "UPGRADE", kind: "capacity" })}
          />
        </div>
      </div>

      <div>
        <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#ff9ecb,#f0438c)" }}>Hype</h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          <Card
            icon={<IconMegaphone size={18} />}
            title="Marketing"
            pips={{ cur: s.marketingLvl, max: upgradeMax("marketing") }}
            desc="Flyers, radio spots, a wacky inflatable tube guy. +12% foot traffic per level."
            extra={`Traffic bonus: +${s.marketingLvl * 12}%`}
            cost={upgradeCost("marketing", s.marketingLvl)} maxed={s.marketingLvl >= upgradeMax("marketing")} canAfford={s.cash >= upgradeCost("marketing", s.marketingLvl)}
            onBuy={() => dispatch({ type: "UPGRADE", kind: "marketing" })}
          />
        </div>
      </div>

      <div>
        <h2 className="panel-title" style={{ background: "linear-gradient(180deg,#8ce68f,#2eb84c)" }}>
          Product Suppliers · {s.unlocked.length}/{ITEMS.length}
        </h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          {locked.map((def) => {
            const lvlOk = s.debug || s.level >= def.reqLevel;
            const afford = s.cash >= def.unlockCost;
            return (
              <div key={def.id} className="bg-white border-[3px] border-ink rounded-[20px] p-3 shadow-[0_5px_0_rgba(27,42,94,.18)] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <ItemChip id={def.id} size="md" />
                  <div className="leading-tight">
                    <div className="font-display text-sm">{def.name}</div>
                    <div className="text-[10px] font-black text-ink-soft">{def.tag} · sells ~{fmt(def.retail)}</div>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-ink-soft">Sign the supplier contract to stock it.</p>
                {!lvlOk && (
                  <p className="text-[10px] font-black text-orange-700 bg-orange-50 border-2 border-orange-200 rounded-lg px-1.5 py-0.5">
                    Requires store level {def.reqLevel}
                  </p>
                )}
                <button
                  className="bb bb-purple mt-auto py-1.5 text-sm"
                  disabled={!lvlOk || !afford}
                  onClick={() => { sfx.pop(); dispatch({ type: "UNLOCK_ITEM", itemId: def.id }); }}
                >
                  Unlock · {fmt(def.unlockCost)}
                </button>
              </div>
            );
          })}
          {locked.length === 0 && (
            <div className="col-span-full text-center text-sm font-black text-emerald-700 bg-emerald-50 border-2 border-emerald-300 rounded-2xl py-3 flex items-center justify-center gap-2">
              <IconCheck size={18} /> Every supplier in town works for you now!
            </div>
          )}
          {ITEMS.filter((i) => s.unlocked.includes(i.id)).map((def) => (
            <div key={def.id} className="flex items-center gap-2 bg-emerald-50/70 border-[3px] border-emerald-300 rounded-[20px] px-3 py-2">
              <ItemChip id={def.id} size="sm" />
              <span className="text-[11px] font-extrabold text-emerald-700">{def.name}</span>
              <IconCheck size={14} className="text-emerald-600 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
