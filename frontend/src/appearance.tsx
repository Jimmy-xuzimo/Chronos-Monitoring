import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
export const palettes = [
  ["black", "纯黑", "#000000", "#252525"],
  ["white", "纯白", "#ffffff", "#dddddd"],
  ["industrial", "工业废土", "#ff752d", "#5b6067"],
  ["lavender", "薰衣草", "#b6a4ee", "#f7d9e9"],
  ["rose", "玫瑰奶昔", "#e6a8c5", "#f9dfcb"],
  ["mint", "薄荷奶绿", "#82c5b4", "#dcebd6"],
  ["sky", "天空蓝莓", "#8dbde9", "#dadcf7"],
  ["peach", "蜜桃乌龙", "#e9b28e", "#f9d5df"],
  ["lemon", "柠檬奶油", "#cec477", "#deedd9"],
];
export function useAppearance() {
  const [mode, setMode] = useState(
    localStorage.getItem("workbench-mode") || "auto",
  );
  const system = () =>
    matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const [theme, setTheme] = useState(mode === "auto" ? system() : mode);
  useEffect(() => {
    if (mode === "auto") {
      const initial = system();
      setMode(initial);
      localStorage.setItem("workbench-mode", initial);
    }
  }, []);
  const [palette, setPaletteState] = useState(
    localStorage.getItem("workbench-palette") || "lavender",
  );
  const busy = useRef(false),
    clicks = useRef(Number(localStorage.getItem("workbench-wave-count") || 0));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem("workbench-palette", palette);
    document
      .querySelector<HTMLLinkElement>('link[rel="icon"]')
      ?.setAttribute("href", "/workbench-" + palette + ".svg");
  }, [palette]);
  async function toggle(event?: any) {
    if (busy.current) return;
    const next = theme === "dark" ? "light" : "dark";
    if (palette === "black" || palette === "white") setPaletteState("lavender");
    const expand = clicks.current % 2 === 0;
    clicks.current++;
    localStorage.setItem("workbench-wave-count", String(clicks.current));
    const rect = event?.currentTarget?.getBoundingClientRect();
    const x = rect ? rect.x + rect.width / 2 : innerWidth * 0.85,
      y = rect ? rect.y + rect.height / 2 : 36;
    const commit = () => {
      flushSync(() => {
        setTheme(next);
        setMode(next);
      });
      document.documentElement.dataset.theme = next;
      localStorage.setItem("workbench-mode", next);
    };
    const doc = document as any;
    if (
      !doc.startViewTransition ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      commit();
      return;
    }
    busy.current = true;
    document.documentElement.dataset.wave = expand ? "expand" : "shrink";
    const transition = doc.startViewTransition(commit);
    try {
      await transition.ready;
      const r = Math.hypot(
        Math.max(x, innerWidth - x),
        Math.max(y, innerHeight - y),
      );
      const small = `circle(0px at ${x}px ${y}px)`,
        large = `circle(${r}px at ${x}px ${y}px)`;
      await document.documentElement.animate(
        { clipPath: expand ? [small, large] : [large, small] },
        {
          duration: 900,
          easing: "cubic-bezier(.65,0,.35,1)",
          pseudoElement: expand
            ? "::view-transition-new(root)"
            : "::view-transition-old(root)",
          fill: "forwards",
        },
      ).finished;
      await transition.finished;
    } catch {
    } finally {
      busy.current = false;
    }
  }
  function choosePalette(value: string) {
    setPaletteState(value);
    if (value === "black" || value === "white") {
      const selected = value === "black" ? "dark" : "light";
      setTheme(selected);
      setMode(selected);
      localStorage.setItem("workbench-mode", selected);
      document.documentElement.dataset.theme = selected;
    }
  }
  return { theme, mode, palette, setPalette: choosePalette, toggle };
}
export function PalettePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="palette-picker" aria-label="选择配色">
      {palettes.map(([id, label, a, b]) => (
        <button
          type="button"
          key={id}
          className={id === value ? "selected" : ""}
          title={label}
          aria-label={label}
          aria-pressed={id === value}
          onClick={() => onChange(id)}
          style={{ background: `linear-gradient(135deg,${a},${b})` }}
        >
          <i style={{ background: `linear-gradient(135deg,${a},${b})` }} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
