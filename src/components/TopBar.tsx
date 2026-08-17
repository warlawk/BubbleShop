import { useRef, useState, type Dispatch } from "react";
import type { Action, GameState } from "../game/types";
import { DAY_LEN, GOAL, fmt, fmt0, levelFromXp } from "../game/data";
import { setMuted, sfx } from "../game/audio";
import { IconCart, IconPause, IconPlay, IconSoundOff, IconSoundOn, IconSun, IconTrophy, StarRow } from "./bits";

function clockText(timeLeft: number) {
  const f = 1 - timeLeft / DAY_LEN;
  const hf = 8 + 12 * f;
  const h24 = Math.floor(hf);
  const m = Math.floor((hf - h24) * 60);
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h = ((h24 + 11) % 12) + 1;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export function TopBar({ s, dispatch }: { s: GameState; dispatch: Dispatch<Action> }) {
  const dayFrac = 1 - s.timeLeft / DAY_LEN;
  const { into, need } = levelFromXp(s.xp);
  const goalPct = Math.min(100, (s.cash / GOAL) * 100);

  /* secret sandbox gesture: tap the golden cart twice, then tap TYCOON once */
  const taps = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [armed, setArmed] = useState(false);
  const armTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCartTap = () => {
    sfx.click();
    taps.current++;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (taps.current >= 2) {
      taps.current = 0;
      setArmed(true);
      if (armTimer.current) clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(false), 4000);
    } else {
      tapTimer.current = setTimeout(() => (taps.current = 0), 1200);
    }
  };
  const onTycoonTap = () => {
    if (!armed) return;
    setArmed(false);
    if (armTimer.current) clearTimeout(armTimer.current);
    sfx.levelup();
    dispatch({ type: "TOGGLE_DEBUG" });
  };

  return (
    <header
      className="sticky top-0 z-30 border-b-4 border-ink px-3 py-2"
      style={{ background: "linear-gradient(180deg, #4fb2ff, #1f86e8)", boxShadow: "0 4px 0 rgba(27,42,94,.25), inset 0 2px 0 rgba(255,255,255,.45)" }}
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* logo */}
        <div className="flex items-center gap-2 mr-1">
          <button
            className="w-10 h-10 rounded-full border-[3px] border-ink flex items-center justify-center text-ink anim-wobble cursor-pointer active:scale-90 transition-transform"
            style={{ background: "linear-gradient(180deg,#ffe27a,#ffb400)", boxShadow: "0 3px 0 rgba(27,42,94,.5), inset 0 2px 0 rgba(255,255,255,.6)" }}
            onClick={onCartTap}
            title="Bubble Mart"
          >
            <IconCart size={22} />
          </button>
          <div className="leading-none">
            <div className="font-display text-white text-xl text-outline cursor-pointer select-none" title="Bubble Mart Tycoon">BUBBLE MART</div>
            <button
              className={`inline-block mt-0.5 px-2 py-[1px] rounded-full bg-candy border-2 border-ink font-display text-[10px] text-white tracking-widest cursor-pointer ${armed ? "anim-ring anim-pulse-big" : ""}`}
              onClick={onTycoonTap}
              title="Tycoon"
            >
              TYCOON
            </button>
          </div>
          {s.debug && (
            <span className="font-display text-[10px] tracking-wider text-[#5c3b00] bg-gradient-to-b from-[#ffe27a] to-[#ffb400] border-2 border-ink rounded-full px-2 py-0.5 shadow-[0_2px_0_rgba(27,42,94,.4)] anim-pop" title="Sandbox mode: infinite cash & all gates lifted">
              🧪 SANDBOX
            </span>
          )}
        </div>

        {/* day + clock */}
        <div className="flex items-center gap-2 bg-white/95 rounded-full border-[3px] border-ink pl-3 pr-2 py-1 shadow-[0_3px_0_rgba(27,42,94,.35)] cursor-pointer select-none" title="Store clock">
          <span className="font-display text-sm">Day {s.day}</span>
          {s.phase === "prep" ? (
            <span className="text-[10px] font-black tracking-widest text-red-600 bg-red-100 border-2 border-red-300 rounded-full px-2 py-[1px] anim-pop">
              🌙 PREP TIME
            </span>
          ) : (
            <>
              <span className="text-xs font-extrabold text-ink-soft">{clockText(s.timeLeft)}</span>
              <div className="relative w-20 h-3 track">
                <div className="fill fill-sun" style={{ width: `${dayFrac * 100}%` }} />
                <span className="absolute -top-2.5 text-sun transition-[left] duration-300" style={{ left: `calc(${dayFrac * 100}% - 9px)` }}>
                  <IconSun size={18} className="text-[#ffb400] drop-shadow" />
                </span>
              </div>
            </>
          )}
        </div>

        {/* cash */}
        <div className="flex items-center rounded-full border-[3px] border-ink px-4 py-1 shadow-[0_3px_0_rgba(27,42,94,.45)] cursor-pointer select-none"
          style={{ background: "linear-gradient(180deg,#8ce68f,#2eb84c)" }} title="Cash in the till">
          <span key={s.cash} className="anim-pop font-display text-white text-lg text-outline tabular-nums">
            {fmt(s.cash)}
          </span>
        </div>

        {/* reputation */}
        <div className="flex items-center gap-1.5 bg-white/95 rounded-full border-[3px] border-ink px-3 py-1 shadow-[0_3px_0_rgba(27,42,94,.35)] cursor-pointer select-none" title="Store reputation">
          <StarRow rep={s.rep} size={16} />
          <span className="text-xs font-black text-ink-soft tabular-nums">{s.rep.toFixed(1)}</span>
        </div>

        {/* level */}
        <div className="flex items-center gap-1.5 bg-white/95 rounded-full border-[3px] border-ink px-3 py-1 shadow-[0_3px_0_rgba(27,42,94,.35)] cursor-pointer select-none" title={`${into}/${need} XP — store level`}>
          <span className="font-display text-sm text-purple-700">Lv {s.level}</span>
          <div className="w-14 h-2.5 track"><div className="fill fill-pink" style={{ width: `${Math.min(100, (into / need) * 100)}%` }} /></div>
        </div>

        {/* goal */}
        <div className="flex items-center gap-1.5 bg-white/95 rounded-full border-[3px] border-ink px-3 py-1 shadow-[0_3px_0_rgba(27,42,94,.35)] cursor-pointer select-none" title={`Goal: ${fmt0(GOAL)} in the till`}>
          <IconTrophy size={17} className="text-[#ffb400]" />
          <div className="w-16 h-2.5 track"><div className="fill fill-green" style={{ width: `${goalPct}%` }} /></div>
          <span className="text-[10px] font-black text-ink-soft tabular-nums">{Math.floor(goalPct)}%</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {s.phase === "playing" && (
            <button
              className={`bb w-10 h-10 flex items-center justify-center ${s.paused ? "bb-green anim-pulse-big" : "bb-yellow"}`}
              onClick={() => { sfx.click(); dispatch({ type: "TOGGLE_PAUSE" }); }}
              title={s.paused ? "Resume (P or Space)" : "Pause (P or Space)"}
            >
              {s.paused ? <IconPlay size={18} /> : <IconPause size={18} />}
            </button>
          )}
          <button
            className="bb bb-slate w-10 h-10 flex items-center justify-center"
            onClick={() => { setMuted(!s.muted); sfx.click(); dispatch({ type: "TOGGLE_MUTE" }); }}
            title={s.muted ? "Unmute" : "Mute"}
          >
            {s.muted ? <IconSoundOff size={18} /> : <IconSoundOn size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
}
