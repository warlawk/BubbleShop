import type { Dispatch } from "react";
import type { Action, GameState } from "../game/types";
import { sfx } from "../game/audio";

/**
 * DoorSign - Interactive store sign that toggles between CLOSED and OPEN states
 * Displays day information and allows players to start the business day
 * @param s - Current game state containing phase and day info
 * @param dispatch - Redux-style dispatch function for game actions
 */
export function DoorSign({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const prep = s.phase === "prep";
  const open = s.phase === "playing";
  if (!prep && !open) return null;

  return (
    <div className="flex flex-col items-center select-none py-1">
      {/* rail + strings */}
      <div className="sign-rail w-64" />
      <div className="relative w-64 h-6">
        <div className="absolute left-[34px] top-0 h-full w-[3px] bg-[#5f3f26] rounded-full -rotate-[8deg] origin-top" />
        <div className="absolute right-[34px] top-0 h-full w-[3px] bg-[#5f3f26] rounded-full rotate-[8deg] origin-top" />
      </div>

      <div className="door-swing -mt-1" style={{ perspective: "600px" }}>
        <button
          key={prep ? "closed" : "open"}
          className={`sign-flip relative block px-12 py-2.5 rounded-[24px] border-[3px] border-ink font-display text-3xl sm:text-4xl tracking-[0.18em] text-white text-outline ${prep ? "cursor-pointer hover:brightness-110 active:translate-y-1" : "cursor-default"}`}
          style={{
            background: prep
              ? "linear-gradient(180deg,#ff8f98,#e8323f)"
              : "linear-gradient(180deg,#8ce68f,#2eb84c)",
            boxShadow:
              "0 7px 0 rgba(27,42,94,.45), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -9px 16px rgba(0,0,0,.14)",
          }}
          disabled={!prep}
          onClick={() => {
            if (prep) {
              sfx.bell();
              dispatch({ type: "OPEN_STORE" });
            }
          }}
          title={prep ? "Flip the sign to open the store" : "The store is open!"}
        >
          {prep ? "CLOSED" : "OPEN"}
          <span className="absolute left-[8%] right-[8%] top-[9%] h-[32%] rounded-full bg-white/30 pointer-events-none" />
        </button>
      </div>

      {prep ? (
        <div className="mt-2.5 text-center anim-pop">
          <p className="text-sm font-black text-white drop-shadow-[0_2px_0_rgba(27,42,94,.65)] max-w-lg px-3">
            🌅 Morning of Day {s.day} — the store is yours before opening!
          </p>
          <p className="text-[11px] font-bold text-white/95 drop-shadow-[0_1px_0_rgba(27,42,94,.6)] max-w-lg px-3 mt-0.5">
            Restock shelves · buy wholesale · hire staff · set prices — then flip the sign to let customers in.
          </p>
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] font-black text-white/95 drop-shadow-[0_1px_0_rgba(27,42,94,.6)]">
          Day {s.day} · doors open — shoppers incoming!
        </p>
      )}
    </div>
  );
}
