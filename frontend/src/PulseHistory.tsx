import { useEffect, useState } from "react";
import { api } from "./api";
export type PulseData = Record<string, { points: any[]; error?: string }>;
export function usePulseHistory(ids: string, enabled: boolean) {
  const [data, setData] = useState<PulseData>({});
  useEffect(() => {
    if (!enabled || !ids) return;
    let active = true,
      running = false;
    async function sync() {
      if (document.hidden || running) return;
      running = true;
      await Promise.allSettled(
        ids.split(",").map(async (id) => {
          try {
            const result = await api(
              "/history?range=24h&node=" + encodeURIComponent(id),
            );
            if (active)
              setData((prev) => ({ ...prev, [id]: { points: result.points } }));
          } catch {
            if (active)
              setData((prev) => ({
                ...prev,
                [id]: { points: prev[id]?.points || [], error: "曲线同步异常" },
              }));
          }
        }),
      );
      running = false;
    }
    sync();
    const timer = setInterval(sync, 60000);
    document.addEventListener("visibilitychange", sync);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [ids, enabled]);
  return data;
}
export default function PulseHistory({ data }: { data?: PulseData[string] }) {
  const points = data?.points || [];
  const start = Date.now() / 1000 - 86400;
  const line = (field: string) =>
    points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${Math.max(0, Math.min(300, ((p.ts - start) / 86400) * 300)).toFixed(1)},${(38 - Math.min(100, Math.max(0, p[field] || 0)) * 0.34).toFixed(1)}`,
      )
      .join(" ");
  return (
    <span className="pulse-history">
      <span className="pulse-caption">
        <span>最近 24 小时</span>
        <span>
          <i />
          CPU <i className="mem" />
          内存
        </span>
      </span>
      {points.length > 1 ? (
        <svg
          viewBox="0 0 300 42"
          preserveAspectRatio="none"
          role="img"
          aria-label="最近24小时 CPU 与内存使用率曲线，范围 0 至 100%"
        >
          <path d="M0 4H300M0 21H300M0 38H300" className="pulse-grid" />
          <path d={line("cpu")} className="pulse-cpu" />
          <path d={line("mem")} className="pulse-mem" />
        </svg>
      ) : (
        <span className="pulse-empty">{data?.error || "历史数据积累中"}</span>
      )}
      <span className="pulse-status">
        {data?.error || "24 小时前 — 现在 · 0–100%"}
      </span>
    </span>
  );
}
