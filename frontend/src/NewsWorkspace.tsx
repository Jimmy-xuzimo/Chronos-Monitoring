import { useEffect, useState } from "react";
import { RefreshCw, ArrowUpRight } from "lucide-react";
import { api } from "./api";
import type { Source } from "./types";
import { Pager, useRows, Panel, Empty } from "./workspace";
export default function NewsWorkspace({ source }: { source: Source }) {
  const [day, setDay] = useState(""),
    [category, setCategory] = useState("全部"),
    [query, setQuery] = useState(""),
    [data, setData] = useState<any>(source.data),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const size = useRows(330, 42, 14);
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
          setMessage("");
        }
      })
      .catch((e) => active && setMessage(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
    };
  }, [day, source.updated]);
  useEffect(() => setPage(1), [day, category, query, size]);
  const dates = source.data?.dates || [source.data?.date].filter(Boolean),
    cats = [
      "全部",
      ...new Set<string>(
        (data?.items || []).map((n: any) => n.category || "其他"),
      ),
    ];
  const rows = (data?.items || []).filter(
    (n: any) =>
      (category === "全部" || n.category === category) &&
      (n.title + " " + n.source).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="workspace">
      <div className="ws-toolbar">
        <div className="ws-controls">
          <select
            aria-label="资讯日期"
            value={day || source.data?.date || ""}
            onChange={(e) => {
              setDay(e.target.value);
              setCategory("全部");
            }}
          >
            {dates.map((d: string) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <select
            aria-label="资讯分类"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            aria-label="搜索资讯"
            placeholder="搜索标题 / 来源"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            try {
              await api("/news/sync", "POST");
              setMessage("已请求同步，稍后自动更新");
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          <RefreshCw size={14} />
          读取
        </button>
      </div>
      <div className="ws-caption">
        每天 07:30 · 上海时间 · {data?.date || "等待同步"} · {rows.length}{" "}
        条资讯
        {(message || source.error) && (
          <span className="warn-text"> · {message || source.error}</span>
        )}
      </div>
      <Panel key={(day || data?.date) + category + page}>
        {busy ? (
          <Empty>正在读取这一期…</Empty>
        ) : (
          <div className="ws-table-wrap">
            <table className="ws-table news-dense">
              <thead>
                <tr>
                  <th>标题</th>
                  <th className="secondary-col">分类</th>
                  <th>来源</th>
                  <th className="secondary-col">时间</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * size, page * size).map((n: any) => (
                  <tr key={(n.category || "") + n.url}>
                    <td>
                      <a
                        className="ws-title"
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={n.title}
                      >
                        <span>
                          {n.title}
                          <small className="mobile-only">{n.category}</small>
                        </span>
                        <ArrowUpRight size={12} />
                      </a>
                    </td>
                    <td className="secondary-col">{n.category}</td>
                    <td title={n.source}>{n.source}</td>
                    <td className="secondary-col">
                      {(n.published || data?.date || "").slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <Empty>没有匹配的资讯</Empty>}
          </div>
        )}
      </Panel>
      <Pager page={page} total={rows.length} size={size} onChange={setPage} />
    </div>
  );
}
