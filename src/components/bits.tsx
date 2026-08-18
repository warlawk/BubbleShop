import React from "react";
import { itemById } from "../game/data";

/* ---------------- item chip: the color-coded commodity ---------------- */

/**
 * ItemChip - Color-coded product badge showing item abbreviation
 * Renders with gradient background based on item definition
 * @param id - Product ID to display
 * @param size - Size variant: "sm", "md", or "lg"
 * @param className - Additional CSS classes
 */
export function ItemChip({
  id,
  size = "md",
  className = "",
}: {
  id: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const def = itemById(id);
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 rounded-[10px] border-2 tracking-wide",
    md: "text-xs px-2.5 py-1 rounded-xl border-2 tracking-wide",
    lg: "text-base px-4 py-2 rounded-2xl border-[3px] tracking-wider",
  }[size];
  return (
    <span
      className={`gchip inline-flex items-center justify-center font-display ${sizes} ${className}`}
      style={{ backgroundImage: `linear-gradient(180deg, ${def.grad[0]}, ${def.grad[1]})` }}
    >
      {def.short}
    </span>
  );
}

/* ---------------- customer avatar bubble ---------------- */

export function Avatar({
  hue,
  size = 44,
  mood = "happy",
  className = "",
}: {
  hue: number;
  size?: number;
  mood?: "happy" | "meh" | "angry";
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 rounded-full border-[3px] border-ink flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(180deg, hsl(${hue} 85% 72%), hsl(${hue} 70% 52%))`,
        boxShadow: "0 3px 0 rgba(27,42,94,.4), inset 0 2px 0 rgba(255,255,255,.55)",
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62}>
        <circle cx="8.5" cy="10" r="1.7" fill="#1b2a5e" />
        <circle cx="15.5" cy="10" r="1.7" fill="#1b2a5e" />
        {mood === "happy" && (
          <path d="M7.5 14.5 Q12 18.5 16.5 14.5" stroke="#1b2a5e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}
        {mood === "meh" && (
          <path d="M8 15.5 H16" stroke="#1b2a5e" strokeWidth="1.8" strokeLinecap="round" />
        )}
        {mood === "angry" && (
          <path d="M7.5 16.5 Q12 13 16.5 16.5" stroke="#1b2a5e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

/* ---------------- star row (reputation) ---------------- */

export function StarRow({ rep, size = 18 }: { rep: number; size?: number }) {
  const star = (fill: string) => (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block" }}>
      <path
        d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"
        fill={fill}
        stroke="#1b2a5e"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
  const pct = Math.max(0, Math.min(100, (rep / 5) * 100));
  return (
    <div className="relative inline-flex" title={`Reputation ${rep.toFixed(1)} / 5`}>
      <div className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <span key={i}>{star("#d8e2f5")}</span>)}</div>
      <div className="absolute inset-0 overflow-hidden flex gap-0.5" style={{ width: `${pct}%` }}>
        {[0, 1, 2, 3, 4].map((i) => <span key={i}>{star("#ffd23f")}</span>)}
      </div>
    </div>
  );
}

/* ---------------- patience ring around avatar ---------------- */

export function PatienceRing({ patience, size = 56 }: { patience: number; size?: number }) {
  const r = size / 2 - 4;
  const C = 2 * Math.PI * r;
  const color = patience > 0.5 ? "#2eb84c" : patience > 0.25 ? "#ff8a00" : "#e8323f";
  return (
    <svg width={size} height={size} className="absolute -inset-[7px]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(27,42,94,.15)" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={C}
        strokeDashoffset={C * (1 - Math.max(0, patience))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .25s linear, stroke .3s" }}
      />
    </svg>
  );
}

/* ---------------- tiny inline SVG icons ---------------- */

type IcProps = { size?: number; className?: string };
const wrap = (children: React.ReactNode) =>
  function Icon({ size = 18, className = "" }: IcProps) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        {children}
      </svg>
    );
  };

export const IconCart = wrap(<><circle cx="9" cy="20" r="1.6" fill="currentColor" /><circle cx="17" cy="20" r="1.6" fill="currentColor" /><path d="M3 4h2.5l2.2 11h10.1l2.2-8H7" /></>);
export const IconStore = wrap(<><path d="M4 10v9h16v-9" /><path d="M3 6l1.5-3h15L21 6c0 1.6-1.3 2.8-3 2.8S15 7.6 15 6c0 1.6-1.3 2.8-3 2.8S9 7.6 9 6c0 1.6-1.3 2.8-3 2.8S3 7.6 3 6z" /><path d="M9.5 19v-5h5v5" /></>);
export const IconBox = wrap(<><path d="M3 8l9-4 9 4v9l-9 4-9-4z" /><path d="M3 8l9 4 9-4M12 12v9" /></>);
export const IconWrench = wrap(<path d="M14 7a4 4 0 0 0-5.6 4.8L3 17.2V21h3.8l5.4-5.4A4 4 0 0 0 17 10l-2.5-.5L14 7z" />);
export const IconSun = wrap(<><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19" /></>);
export const IconTrophy = wrap(<><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 5H4.5v1.5A3.5 3.5 0 0 0 8 10M16 5h3.5v1.5A3.5 3.5 0 0 1 16 10" /><path d="M12 13v4M8.5 20h7M10 17h4v3h-4z" /></>);
export const IconLock = wrap(<><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const IconRegister = wrap(<><rect x="3" y="10" width="18" height="9" rx="2" /><path d="M7 10V6h10v4M7 14h2M11 14h2M15 14h2" /></>);
export const IconPerson = wrap(<><circle cx="12" cy="7.5" r="3.5" /><path d="M5 20c1-4 3.5-6 7-6s6 2 7 6" /></>);
export const IconMegaphone = wrap(<><path d="M3 10v4l4 .8L18 19V5L7 9.2z" /><path d="M18 9a3 3 0 0 1 0 6M8 15v4" /></>);
export const IconShelf = wrap(<><path d="M4 3v18M20 3v18" /><path d="M4 8h16M4 15h16" /><rect x="7" y="4.5" width="3" height="3.5" rx="0.8" /><rect x="12" y="10.5" width="4" height="4.5" rx="0.8" /></>);
export const IconSoundOn = wrap(<><path d="M4 9v6h3.5L12 19V5L7.5 9z" /><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>);
export const IconSoundOff = wrap(<><path d="M4 9v6h3.5L12 19V5L7.5 9z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></>);
export const IconUp = wrap(<path d="M12 19V5M6 11l6-6 6 6" />);
export const IconDown = wrap(<path d="M12 5v14M6 13l6 6 6-6" />);
export const IconCheck = wrap(<path d="M4.5 12.5l5 5L19.5 7" />);
export const IconBolt = wrap(<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z" />);
export const IconCoin = wrap(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.5 9.8c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1 1.8-2.5 2.2-2.5 1-2.5 2.2 1.1 2 2.5 2 2.5-.8 2.5-2" strokeWidth="1.6" /></>);
export const IconPause = wrap(<><rect x="6.5" y="5" width="3.8" height="14" rx="1.3" fill="currentColor" stroke="none" /><rect x="13.7" y="5" width="3.8" height="14" rx="1.3" fill="currentColor" stroke="none" /></>);
export const IconPlay = wrap(<path d="M8 5.2v13.6L19 12z" fill="currentColor" stroke="none" />);

/** Faux product barcode — deterministic per seed, same style across all goods. */
export function Barcode({ seed, className }: { seed: string; className?: string }) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h >>> 0) % 1000) / 1000;
  };
  const bars: { x: number; w: number }[] = [];
  let x = 5;
  while (x < 88) {
    const w = 1.2 + Math.floor(rnd() * 3) * 1.15;
    bars.push({ x, w });
    x += w + 1 + Math.floor(rnd() * 3) * 1.3;
  }
  const digits = ((h >>> 0) % 100000000).toString().padStart(8, "0");
  return (
    <svg viewBox="0 0 100 34" className={className} preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="0" width="100" height="34" rx="3" fill="#ffffff" />
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="3.5" width={b.w} height="21" fill="#1b2a5e" />
      ))}
      <text
        x="50" y="31" textAnchor="middle" fontSize="6.5" fontWeight="bold"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" letterSpacing="2.5" fill="#1b2a5e"
      >
        {digits}
      </text>
    </svg>
  );
}
