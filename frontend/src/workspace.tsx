import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
export function useRows(reserved = 300, row = 40, max = 14, min = 3) {
  const compute = () =>
    Math.max(
      min,
      Math.min(
        max,
        Math.floor(
          (innerHeight - reserved) /
            (innerWidth < 720 ? Math.max(row, 58) : row),
        ),
      ),
    );
  const [n, set] = useState(compute);
  useEffect(() => {
    const f = () => set(compute());
    f();
    addEventListener("resize", f);
    return () => removeEventListener("resize", f);
  }, [reserved, row, max, min]);
  useLayoutEffect(() => {
    const wrap = document.querySelector<HTMLElement>(
      ".workspace .ws-table-wrap",
    );
    if (!wrap) {
      set(compute());
      return;
    }
    const fit = () => {
      const table = wrap.querySelector("table"),
        head = table?.querySelector("thead"),
        first = table?.querySelector("tbody tr");
      if (!first) return;
      const height = first.getBoundingClientRect().height;
      if (height > 0)
        set(
          Math.max(
            min,
            Math.min(
              max,
              Math.floor(
                (wrap.clientHeight -
                  (head?.getBoundingClientRect().height || 0) -
                  2) /
                  height,
              ),
            ),
          ),
        );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    return () => observer.disconnect();
  });
  return n;
}
export function Pager({
  page,
  total,
  size,
  onChange,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (v: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="ws-pager">
      <span>
        共 {total} 项 · {Math.min(page, pages)} / {pages} 页
      </span>
      <button
        className="icon-btn"
        aria-label="上一页"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={17} />
      </button>
      <button
        className="icon-btn"
        aria-label="下一页"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ws-tabs" role="tablist">
      {items.map(([id, name]) => (
        <button
          role="tab"
          aria-selected={value === id}
          key={id}
          className={value === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
const names: Record<string, string> = {
  up: "正常",
  down: "不可用",
  checking: "复核中",
  pending: "等待中",
  unknown: "未读取",
  ok: "已同步",
  stale: "已过期",
  error: "同步失败",
  open: "进行中",
  closed: "已关闭",
  merged: "已合并",
  success: "通过",
  failure: "失败",
  unavailable: "无法读取",
  none: "无检查",
  approved: "已批准",
  changes_requested: "需修改",
  requested: "待审阅",
};
export function Status({ value }: { value: string }) {
  return (
    <span className={"badge " + value}>
      <i />
      {names[value] || value}
    </span>
  );
}
export const bytes = (n = 0) =>
  n >= 1024 ** 3
    ? (n / 1024 ** 3).toFixed(1) + " GB"
    : n >= 1024 ** 2
      ? (n / 1024 ** 2).toFixed(1) + " MB"
      : n >= 1024
        ? (n / 1024).toFixed(0) + " KB"
        : Math.round(n) + " B";
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={"ws-panel " + className}>{children}</div>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="ws-empty">{children}</div>;
}
