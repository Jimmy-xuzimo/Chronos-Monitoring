import { useState, useRef, useEffect } from "react";
import {
  Star,
  GripVertical,
  Pencil,
  Check,
  X,
  ArrowUpRight,
  Search,
} from "lucide-react";
import type { Entry, Overview } from "./types";
import { Pager, useRows } from "./workspace";
export default function EntryBoard({
  entries,
  services,
  onSave,
}: {
  entries: Entry[];
  services: Overview["services"];
  onSave: (v: any) => Promise<void>;
}) {
  const [items, setItems] = useState(entries),
    [group, setGroup] = useState("收藏"),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState<string | null>(null),
    [name, setName] = useState(""),
    [message, setMessage] = useState(""),
    [saving, setSaving] = useState(false),
    [over, setOver] = useState<string | null>(null);
  const available = useRows(320, 80, 12, 1);
  const size = innerWidth >= 1050 ? 4 : available;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [group, query, size]);
  const dragged = useRef<string | null>(null);
  useEffect(() => {
    if (!dragged.current) setItems(entries);
  }, [entries]);
  const groups = ["收藏", ...new Set(items.map((e) => e.group)), "全部"];
  const list = items.filter(
    (e) =>
      (group === "收藏" ? e.pinned : group === "全部" || e.group === group) &&
      (e.name + e.group).toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(
    () =>
      setPage((p) => Math.min(p, Math.max(1, Math.ceil(list.length / size)))),
    [list.length, size],
  );
  async function persist(next: Entry[]) {
    const before = items;
    setItems(next);
    setSaving(true);
    try {
      await onSave({ entries: next });
      setMessage("已保存");
    } catch (e) {
      setItems(before);
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function reorder(from: string, to: string) {
    if (from === to) return;
    const next = [...items],
      a = next.findIndex((e) => e.id === from),
      b = next.findIndex((e) => e.id === to);
    if (a < 0 || b < 0) return;
    next.splice(b, 0, next.splice(a, 1)[0]);
    void persist(next);
  }
  return (
    <section className="card entries-card">
      <div className="card-head">
        <div>
          <div className="eyebrow">A PLACE FOR EVERYTHING</div>
          <h2>常用入口</h2>
        </div>
        <label className="search small">
          <Search size={13} />
          <input
            aria-label="搜索入口"
            placeholder="搜索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="group-tabs">
        {groups.map((g) => (
          <button
            key={g}
            className={group === g ? "selected" : ""}
            onClick={() => setGroup(g)}
          >
            {g === "自托管服务" ? "自托管" : g}
          </button>
        ))}
      </div>
      <div className="entries-grid">
        {list.slice((page - 1) * size, page * size).map((entry, n) => {
          const i = (page - 1) * size + n;
          const s = services.items.find((s) => s.id === entry.service);
          return (
            <div
              key={entry.id}
              data-entry-id={entry.id}
              className={
                "entry-tile " + (over === entry.id ? "drop-target" : "")
              }
            >
              <button
                className="grip"
                aria-label={"拖动排序 " + entry.name}
                title="拖动排序；键盘上下键调整"
                disabled={saving}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                    e.preventDefault();
                    const other = list[i + (e.key === "ArrowUp" ? -1 : 1)];
                    if (other) reorder(entry.id, other.id);
                  }
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  dragged.current = entry.id;
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (dragged.current) {
                    const target = document
                      .elementFromPoint(e.clientX, e.clientY)
                      ?.closest("[data-entry-id]");
                    setOver(target?.getAttribute("data-entry-id") || null);
                  }
                }}
                onPointerUp={() => {
                  const from = dragged.current;
                  dragged.current = null;
                  setOver(null);
                  if (from && over) reorder(from, over);
                }}
                onPointerCancel={() => {
                  dragged.current = null;
                  setOver(null);
                }}
              >
                <GripVertical size={13} />
              </button>
              <a
                className="entry-main"
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="entry-icon">{entry.name.slice(0, 1)}</span>
                <span>
                  <strong>{entry.name}</strong>
                  <small>{new URL(entry.url).hostname}</small>
                </span>
                {s && (
                  <i
                    className={
                      "service-dot " +
                      (s.status === "ok" ? s.data?.status : "unknown")
                    }
                  />
                )}
                <ArrowUpRight size={12} />
              </a>
              <div className="entry-tools">
                <button
                  aria-label={
                    (entry.pinned ? "取消收藏 " : "收藏 ") + entry.name
                  }
                  title="收藏"
                  onClick={() =>
                    persist(
                      items.map((e) =>
                        e.id === entry.id ? { ...e, pinned: !e.pinned } : e,
                      ),
                    )
                  }
                >
                  <Star
                    size={12}
                    fill={entry.pinned ? "currentColor" : "none"}
                  />
                </button>
                <button
                  aria-label={"修改名称 " + entry.name}
                  title="修改名称"
                  onClick={() => {
                    setEdit(entry.id);
                    setName(entry.name);
                  }}
                >
                  <Pencil size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {!list.length && (
        <div className="empty">
          {group === "收藏"
            ? "在其他分组点击星标，将入口加入收藏。"
            : "没有匹配的入口"}
        </div>
      )}
      {list.length > size && (
        <Pager page={page} total={list.length} size={size} onChange={setPage} />
      )}
      <span className="entry-hint" aria-live="polite">
        {saving ? "正在保存…" : message || "拖动左侧手柄排序 · 星标收藏"}
      </span>
      {edit && (
        <div className="inline-rename">
          <label>
            入口名称
            <input
              autoFocus
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEdit(null);
                if (e.key === "Enter" && name.trim()) {
                  void persist(
                    items.map((x) =>
                      x.id === edit ? { ...x, name: name.trim() } : x,
                    ),
                  );
                  setEdit(null);
                }
              }}
            />
          </label>
          <button
            className="icon-btn"
            aria-label="保存名称"
            disabled={!name.trim()}
            onClick={() => {
              void persist(
                items.map((x) =>
                  x.id === edit ? { ...x, name: name.trim() } : x,
                ),
              );
              setEdit(null);
            }}
          >
            <Check size={17} />
          </button>
          <button
            className="icon-btn"
            aria-label="取消修改"
            onClick={() => setEdit(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
