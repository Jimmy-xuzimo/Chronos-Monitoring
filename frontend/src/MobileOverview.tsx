import { useState, useEffect } from "react";
import { CalendarDays, Activity, GitBranch, ArrowUpRight } from "lucide-react";
import type { Overview, Course } from "./types";
import PulseHistory, { type PulseData } from "./PulseHistory";
import EntryBoard from "./EntryBoard";
import NewsWorkspace from "./NewsWorkspace";
import { Pager } from "./workspace";
const rate = (n = 0) =>
  n >= 1048576
    ? (n / 1048576).toFixed(1) + " MB"
    : (n / 1024).toFixed(0) + " KB";
export default function MobileOverview({
  data,
  pulse,
  now,
  onCourse,
  onNavigate,
  onNode,
  onSave,
}: {
  data: Overview;
  pulse: PulseData;
  now: Date;
  onCourse: (c: Course) => void;
  onNavigate: (p: string) => void;
  onNode: (id: string) => void;
  onSave: (v: any) => Promise<void>;
}) {
  const [page, setPage] = useState("overview"),
    [coursePage, setCoursePage] = useState(1);
  const tz = data.calendar.timezone;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const time = (s: string) =>
    new Intl.DateTimeFormat("zh-CN", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(s));
  const courses = data.calendar.events.filter(
    (e) =>
      e.date === today ||
      (e.date < today &&
        (e.all_day ? e.end.slice(0, 10) > today : e.end.slice(0, 10) >= today)),
  );
  const next = data.calendar.events.find(
    (e) => !e.untimed && new Date(e.start) > now,
  );
  const [courseSize, setCourseSize] = useState(2);
  useEffect(() => {
    const card = document.querySelector<HTMLElement>(".mo-today");
    if (!card || page !== "overview") return;
    const fit = () => {
      const style = getComputedStyle(card);
      const room =
        card.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom) -
        (card.querySelector("header")?.clientHeight || 20) -
        34;
      setCourseSize(Math.max(1, Math.min(6, Math.floor(room / 42))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(card);
    return () => observer.disconnect();
  }, [page]);
  useEffect(() => setCoursePage(1), [today, courseSize]);
  const prs = data.github.data?.prs || [];
  const abnormal = data.services.items.filter(
    (s) => s.status !== "ok" || s.data?.status !== "up",
  ).length;
  return (
    <div className="mobile-overview mobile-pages">
      <div className="mo-page-content" key={page}>
        {page === "overview" ? (
          <div className="mo-first-page">
            <section className="mo-card mo-today">
              <header>
                <h2>
                  <CalendarDays />
                  今日课表 <small>{courses.length} 项</small>
                </h2>
                <button onClick={() => onNavigate("calendar")}>
                  完整课表 <ArrowUpRight />
                </button>
              </header>
              <div className="mo-today-list">
                {courses
                  .slice((coursePage - 1) * courseSize, coursePage * courseSize)
                  .map((e) => (
                    <button
                      key={e.id}
                      className={
                        "mo-today-row " +
                        (!e.untimed &&
                        new Date(e.start) <= now &&
                        new Date(e.end) > now
                          ? "current"
                          : "")
                      }
                      onClick={() => onCourse(e)}
                    >
                      <span>
                        {e.untimed ? "时间待定" : time(e.start)}
                        <small>{e.untimed ? "" : time(e.end)}</small>
                      </span>
                      <strong>
                        {e.title}
                        <small>
                          {e.location || "地点待定"}
                          {e.warning ? " · 待确认" : ""}
                        </small>
                      </strong>
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
              </div>
              {!courses.length &&
                (next ? (
                  <button
                    className="mo-next-course"
                    onClick={() => onCourse(next)}
                  >
                    <small>
                      {data.calendar.sources.some((s) => s.status !== "ok")
                        ? "订阅暂未更新 · 最近记录中的下一课"
                        : "今日无课 · 下一门课"}
                    </small>
                    <strong>
                      {next.title}
                      <ArrowUpRight size={14} />
                    </strong>
                    <span>
                      {next.date} · {time(next.start)}–{time(next.end)}
                    </span>
                    <span>
                      {next.location || "地点待定"}
                      {next.warning ? " · " + next.warning : ""}
                    </span>
                  </button>
                ) : (
                  <div className="mo-empty">
                    {data.calendar.sources.some((s) => s.status !== "ok")
                      ? "订阅暂未更新，暂不能确认今天的课程"
                      : "今天没有固定课程，暂无后续安排"}
                  </div>
                ))}
              {courses.length > courseSize && (
                <Pager
                  page={coursePage}
                  total={courses.length}
                  size={courseSize}
                  onChange={setCoursePage}
                />
              )}
            </section>
            <section className="mo-card mo-devices">
              <header>
                <h2>
                  <Activity />
                  设备脉搏
                </h2>
                <button
                  className={abnormal ? "warn-text" : ""}
                  onClick={() => onNavigate("services")}
                >
                  {abnormal
                    ? abnormal + " 项待关注"
                    : data.services.items.length + " 个网站正常"}{" "}
                  <ArrowUpRight />
                </button>
              </header>
              <div className="mo-node-grid">
                {data.nodes.map((n: any) => (
                  <button
                    className="mo-node"
                    key={n.id}
                    onClick={() => onNode(n.id)}
                  >
                    <span className="mo-node-name">
                      <strong>
                        {n.kind === "server" ? "云服务器" : "本地电脑"}
                      </strong>
                      <i className={"node-status " + n.status}>
                        {n.status === "online" ? "在线" : "离线"}
                      </i>
                    </span>
                    <span className="mo-node-spec">
                      {n.cores || "—"} 核 ·{" "}
                      {n.memory
                        ? (n.memory / 1024 ** 3).toFixed(1) + " GB"
                        : "等待上报"}
                    </span>
                    <span className="mo-metrics">
                      {[
                        ["CPU", n.cpu],
                        ["内存", n.mem],
                        ["磁盘", n.disk],
                      ].map(([label, value]) => (
                        <span key={label}>
                          {label}
                          <b>
                            {typeof value === "number"
                              ? value.toFixed(0) + "%"
                              : "—"}
                          </b>
                        </span>
                      ))}
                    </span>
                    <PulseHistory data={pulse[n.id]} />
                    <span className="mo-node-network">
                      <span>↑ {rate(n.tx)}/s</span>
                      <span>↓ {rate(n.rx)}/s</span>
                    </span>
                    <span className="mo-node-uptime">
                      运行 {Math.floor((n.uptime || 0) / 86400)} 天{" "}
                      {Math.floor(((n.uptime || 0) % 86400) / 3600)} 小时 ·
                      查看详情 ↗
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className="mo-card mo-projects">
              <header>
                <h2>
                  <GitBranch />
                  项目动态
                </h2>
                <button onClick={() => onNavigate("github")}>
                  {data.github.data?.repos?.length || 0} 仓库 ·{" "}
                  {prs.filter((p: any) => p.state === "open").length} PR{" "}
                  <ArrowUpRight />
                </button>
              </header>
              <div className="mo-links">
                {prs.slice(0, 3).map((p: any) => (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={p.id}
                  >
                    <span>
                      {p.title}
                      <em>
                        {p.repo} #{p.number}
                      </em>
                    </span>
                    <small>
                      {p.state === "merged"
                        ? "已合并"
                        : p.state === "open"
                          ? "进行中"
                          : "已关闭"}
                    </small>
                  </a>
                ))}
                {!prs.length && (
                  <span className="mo-empty">
                    {data.github.status === "ok"
                      ? "暂无公开 PR"
                      : "项目数据等待同步"}
                  </span>
                )}
              </div>
            </section>
          </div>
        ) : page === "entries" ? (
          <EntryBoard
            entries={data.entries}
            services={data.services}
            onSave={onSave}
          />
        ) : (
          <NewsWorkspace source={data.news} />
        )}
      </div>
      <nav className="mo-page-nav" aria-label="手机总览分页">
        {[
          ["overview", "总览"],
          ["entries", "入口"],
          ["news", "资讯"],
        ].map(([id, label], i) => (
          <button
            key={id}
            aria-current={page === id ? "page" : undefined}
            className={page === id ? "active" : ""}
            onClick={() => setPage(id)}
          >
            <i />
            {label}
            <small>{i + 1}/3</small>
          </button>
        ))}
      </nav>
    </div>
  );
}
