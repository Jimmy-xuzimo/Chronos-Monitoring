import { useState, useEffect } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { api } from "./api";
import type { Source } from "./types";
export default function NewsBoard({ source }: { source: Source }) {
  const [day, setDay] = useState(""),
    [category, setCategory] = useState("全部"),
    [data, setData] = useState<any>(source.data),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const dates = source.data?.dates || [source.data?.date].filter(Boolean);
  useEffect(() => {
    if (!day || day === source.data?.date) {
      setData(source.data);
      return;
    }
    let active = true;
    setBusy(true);
    api("/news?date=" + day)
      .then((r) => {
        if (active) {
          setData(r.data);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [day, source.updated]);
  const cats = [
    "全部",
    ...new Set<string>(
      (data?.items || []).map((n: any) => n.category || "其他"),
    ),
  ];
  const items = (data?.items || []).filter(
    (n: any) => category === "全部" || (n.category || "其他") === category,
  );
  return (
    <>
      <div className="news-hero">
        <div>
          <div className="eyebrow">THE DAILY EDITION</div>
          <h2>好奇心，每天更新。</h2>
          <p>来自你的 AI DAILY · 每天 07:30 同步</p>
        </div>
        <button
          className="secondary"
          onClick={async () => {
            setBusy(true);
            try {
              await api("/news/sync", "POST");
              setError("已请求同步，稍后自动更新");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw size={14} />
          立即读取
        </button>
      </div>
      <div className="edition-dates">
        {dates.map((d: string) => (
          <button
            className={(day || source.data?.date) === d ? "active" : ""}
            key={d}
            onClick={() => {
              setDay(d);
              setCategory("全部");
            }}
          >
            {d.slice(5).replace("-", "月")}日
          </button>
        ))}
      </div>
      <div className="group-tabs news-categories">
        {cats.map((c) => (
          <button
            key={c}
            className={category === c ? "selected" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {(error || source.error) && (
        <div className="notice">{error || source.error}</div>
      )}
      {busy ? (
        <div className="empty">正在读取这一期资讯…</div>
      ) : (
        <div className="news-grid">
          {items.map((n: any, i: number) => (
            <a
              key={(n.category || "other") + n.url}
              className="news-article card"
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div>
                <span className="eyebrow">
                  {n.category || "资讯"} · {String(i + 1).padStart(2, "0")}
                </span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{n.title}</h3>
              <span className="muted">
                {n.source} · {n.published || data?.date}
              </span>
            </a>
          ))}
        </div>
      )}
      {!items.length && !busy && <div className="empty">这一分类暂无资讯</div>}
    </>
  );
}
