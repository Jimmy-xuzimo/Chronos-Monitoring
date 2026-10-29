import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  CalendarDays,
  Activity,
  Server,
  GitPullRequest,
  Newspaper,
  Settings,
  Bell,
  Sun,
  Moon,
  ArrowUpRight,
  ArrowRight,
  Clock,
  MapPin,
  GraduationCap,
  X,
  Check,
  LogOut,
  RefreshCw,
  ShieldCheck,
  GitBranch,
  TriangleAlert,
  Menu,
  Layers,
  CheckCircle2,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import type { Course, Source, Overview, CalendarData, Alert } from "./types";
import { api, setCsrf } from "./api";
import "./style.css";
import DualHealth from "./DualHealth";
import HomeClock, { Greeting } from "./HomeClock";
import { usePulseHistory } from "./PulseHistory";
import MobileOverview from "./MobileOverview";
import EntryBoard from "./EntryBoard";
import { useAppearance, PalettePicker } from "./appearance";
import "./glass.css";
import AutoMenu from "./AutoMenu";
import { useDialog } from "./useDialog";
import { Pager, useRows } from "./workspace";
import ServicesWorkspace from "./ServicesWorkspace";
import GithubWorkspace from "./GithubWorkspace";
import NewsWorkspace from "./NewsWorkspace";
import CalendarWorkspace from "./CalendarWorkspace";
import SettingsWorkspace from "./SettingsWorkspace";
import "./harmony.css";
import "./workspace.css";
import "./mobile.css";

const NAV = [
  ["home", "总览", LayoutDashboard],
  ["calendar", "个人课表", CalendarDays],
  ["services", "服务器与服务", Server],
  ["github", "GitHub", GitBranch],
  ["news", "AI 资讯", Newspaper],
  ["settings", "设置", Settings],
] as const;
const dayMs = 86400000;
function dateKey(date: Date, tz = "Asia/Shanghai") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function occursOn(e: Course, key: string) {
  return (
    e.date === key ||
    (e.date < key &&
      (e.all_day ? e.end.slice(0, 10) > key : e.end.slice(0, 10) >= key))
  );
}
function timeText(value: string | number, tz = "Asia/Shanghai") {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(typeof value === "number" ? value * 1000 : value));
}
function until(target: Course, current: Course | undefined, now: Date) {
  const minutes = Math.max(
    1,
    Math.ceil(
      (new Date(current ? target.end : target.start).getTime() -
        now.getTime()) /
        60000,
    ),
  );
  return minutes < 120
    ? minutes + " 分钟"
    : minutes < 1440
      ? Math.floor(minutes / 60) + " 小时后"
      : Math.floor(minutes / 1440) + " 天后";
}
function shortDate(value: string | number) {
  return new Date(
    typeof value === "number" ? value * 1000 : value,
  ).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  });
}
function relative(value: number | null) {
  if (!value) return "尚未同步";
  const n = Math.max(0, Math.floor((Date.now() / 1000 - value) / 60));
  return n < 1
    ? "刚刚更新"
    : n < 60
      ? `${n} 分钟前更新`
      : n < 1440
        ? `${Math.floor(n / 60)} 小时前更新`
        : `${Math.floor(n / 1440)} 天前更新`;
}
function weekOf(date: string, start: string) {
  return (
    Math.floor(
      (Date.parse(date + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) /
        (7 * dayMs),
    ) + 1
  );
}
const labels: Record<string, string> = {
  up: "正常",
  down: "不可用",
  checking: "复核中",
  pending: "等待中",
  unknown: "未读取",
  ok: "已同步",
  stale: "数据过期",
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
function Badge({ value, text }: { value: string; text?: string }) {
  return (
    <span className={`badge ${value}`}>
      <i />
      {text || labels[value] || value}
    </span>
  );
}
function Empty({
  children,
  icon: Icon = Layers,
}: {
  children: React.ReactNode;
  icon?: any;
}) {
  return (
    <div className="empty">
      <Icon size={25} />
      <span>{children}</span>
    </div>
  );
}
function SourceNote({ source }: { source: Omit<Source, "data"> }) {
  return (
    <div
      className={`source-note ${source.status === "ok" ? "" : "source-error"}`}
    >
      <span className="dot" />
      {source.status === "ok"
        ? relative(source.updated)
        : source.error || labels[source.status]}
      {source.status !== "ok" && source.updated && (
        <span> · 上次成功 {relative(source.updated).replace("更新", "")}</span>
      )}
    </div>
  );
}
function Card({
  title,
  eyebrow,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  icon?: any;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="card-head">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2>
            {Icon && <Icon size={17} />} {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Login({ onLogin, palette }: { onLogin: () => void; palette: string }) {
  const [user, setUser] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("/login", "POST", { username: user, password });
      setCsrf(r.csrf);
      onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-art">
        <div className="brand">
          <img
            className="brand-mark"
            src={"/workbench-" + palette + ".svg"}
            alt="我的工作台"
          />
          我的工作台
          <span className="brand-slash"> / </span>PANEL
        </div>
        <div>
          <div className="eyebrow">YOUR WORKSPACE</div>
          <h1>
            日常与数字世界，
            <br />
            在这里汇合。
          </h1>
          <p>
            课程安排、服务状态、项目进展。
            <br />
            把值得关注的事，放在一起。
          </p>
          <div className="login-orbit">
            <CalendarDays size={32} />
            <Activity size={32} />
            <GitBranch size={32} />
          </div>
        </div>
        <span className="muted">PRIVATE WORKSPACE · V3.0</span>
      </div>
      <form className="login-form" onSubmit={submit}>
        <span className="login-label">
          <LockKeyhole size={18} /> 我的工作台
        </span>
        <h2>欢迎回来</h2>
        <p className="muted">登录，开始查看今天的安排。</p>
        <label>
          账号
          <input
            autoComplete="username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
            autoFocus
            placeholder="输入你的账号"
          />
        </label>
        <label>
          密码
          <div className="password-field">
            <input
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="输入密码"
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={show ? "隐藏密码" : "显示密码"}
              onClick={() => setShow(!show)}
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "正在登录…" : "进入工作台"}
          <ArrowRight size={17} />
        </button>
        <div className="login-foot">
          <ShieldCheck size={14} /> 个人数据仅在登录后可见
        </div>
      </form>
    </div>
  );
}

function CourseDialog({
  course,
  onClose,
  tz,
}: {
  course: Course;
  onClose: () => void;
  tz: string;
}) {
  const { ref, close } = useDialog(onClose);
  return (
    <dialog
      ref={ref}
      className="course-dialog"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <span className="eyebrow">COURSE DETAIL</span>
        <button className="icon-btn" onClick={close} aria-label="关闭课程详情">
          <X size={20} />
        </button>
      </div>
      <span className="calendar-chip" style={{ color: "var(--accent)" }}>
        {course.calendar}
      </span>
      <h2>{course.title}</h2>
      {course.warning && (
        <div className="notice">
          <TriangleAlert size={16} />
          {course.warning} · 请以学校通知为准
        </div>
      )}
      <dl className="detail-list">
        {[
          [
            "时间",
            course.untimed
              ? `${course.date} · 时间未定`
              : `${course.date} ${timeText(course.start, tz)}–${timeText(course.end, tz)}`,
          ],
          ["地点", course.location || "未提供"],
          ["教师", course.teacher || "未提供"],
          ["节次", course.periods ? "第 " + course.periods + " 节" : "未提供"],
          ["教学周", course.week ? "第 " + course.week + " 周" : "见原始备注"],
        ].map(([a, b]) => (
          <React.Fragment key={a}>
            <dt>{a}</dt>
            <dd>{b}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div className="description">{course.description || "暂无备注"}</div>
      <button className="primary" onClick={close}>
        知道了
        <Check size={17} />
      </button>
    </dialog>
  );
}

function Today({
  calendar,
  now,
  onCourse,
  onNavigate,
}: {
  calendar: CalendarData;
  now: Date;
  onCourse: (c: Course) => void;
  onNavigate: () => void;
}) {
  const today = dateKey(now, calendar.timezone);
  const todayEvents = calendar.events.filter((e) => occursOn(e, today));
  const size = useRows(560, 58, 6, 1);
  const [dayPage, setDayPage] = useState(1);
  useEffect(() => setDayPage(1), [today, size]);
  const timed = todayEvents.filter((e) => !e.untimed);
  const current = timed.find(
    (e) => new Date(e.start) <= now && new Date(e.end) > now,
  );
  const upcoming = calendar.events.find(
    (e) => !e.untimed && new Date(e.start) > now,
  );
  const target = current || upcoming;
  const failed = calendar.sources.some((s) => s.status !== "ok");
  return (
    <Card
      title="今日课表"
      eyebrow="YOUR DAY, AT A GLANCE"
      icon={CalendarDays}
      className="today-card"
      action={
        <button className="text-btn" onClick={onNavigate}>
          完整课表
          <ArrowUpRight size={15} />
        </button>
      }
    >
      <div className="next-course">
        <div className="next-top">
          <span className="tiny-label">
            {current ? "正在上课" : target ? "下一节课" : "接下来"}
          </span>
          {target && (
            <span className="countdown">
              {current
                ? "距离下课"
                : target.date !== today
                  ? shortDate(target.start) + " · "
                  : ""}
              {until(target, current, now)}
            </span>
          )}
        </div>
        {target ? (
          <>
            <button
              className="course-title-btn"
              onClick={() => onCourse(target)}
            >
              {target.title}
              <ArrowUpRight size={21} />
            </button>
            <div className="next-meta">
              <span>
                <Clock size={14} />
                {timeText(target.start, calendar.timezone)}–
                {timeText(target.end, calendar.timezone)}
              </span>
              <span>
                <MapPin size={14} />
                {target.location || "地点待定"}
              </span>
              {target.teacher && (
                <span>
                  <GraduationCap size={15} />
                  {target.teacher}
                </span>
              )}
            </div>
            {target.warning && (
              <div className="course-warning">
                {target.warning} · 以学校通知为准
              </div>
            )}
          </>
        ) : (
          <>
            <h3>{failed ? "课表等待同步" : "暂时没有后续课程"}</h3>
            <p className="muted">
              {failed
                ? "当前无法确认课程安排，请查看同步状态。"
                : "可以查看周课表，或在设置中更新订阅。"}
            </p>
          </>
        )}
      </div>
      <div className="section-label">
        <span>今日安排</span>
        <span>{todayEvents.length} 项</span>
      </div>
      <div className="timeline">
        {todayEvents.length ? (
          todayEvents.slice((dayPage - 1) * size, dayPage * size).map((e) => {
            const ended = new Date(e.end) <= now;
            return (
              <button
                className={`timeline-row ${ended ? "ended" : ""} ${current?.id === e.id ? "current" : ""}`}
                key={e.id}
                onClick={() => onCourse(e)}
              >
                <span className="timeline-time">
                  {e.untimed ? "待定" : timeText(e.start, calendar.timezone)}
                  <small>
                    {e.untimed
                      ? "周期提示"
                      : timeText(e.end, calendar.timezone)}
                  </small>
                </span>
                <span
                  className="timeline-marker"
                  style={{ background: "var(--accent)" }}
                />
                <span className="timeline-body">
                  <strong>{e.title}</strong>
                  <small>
                    {e.location || "未提供地点"}
                    {e.periods && " · 第 " + e.periods + " 节"}
                  </small>
                </span>
                <span className="timeline-status">
                  {current?.id === e.id ? (
                    <Badge value="up" text="进行中" />
                  ) : ended ? (
                    <Check size={15} />
                  ) : (
                    <ArrowUpRight size={15} />
                  )}
                </span>
              </button>
            );
          })
        ) : (
          <Empty icon={CalendarDays}>
            {failed
              ? "课表同步异常，暂不能确认是否有课"
              : "今天没有固定课程，留一点时间给自己。"}
          </Empty>
        )}
      </div>
      {todayEvents.length > size && (
        <Pager
          page={dayPage}
          total={todayEvents.length}
          size={size}
          onChange={setDayPage}
        />
      )}
      {calendar.sources.map((s) => (
        <SourceNote key={s.id} source={s} />
      ))}
    </Card>
  );
}

function ProjectSummary({
  source,
  onNavigate,
}: {
  source: Source;
  onNavigate: () => void;
}) {
  const prs = source.data?.prs || [];
  const repos = source.data?.repos || [];
  return (
    <Card
      title="项目动态"
      eyebrow="BUILD & CONTRIBUTE"
      icon={GitBranch}
      action={
        <button className="text-btn" onClick={onNavigate}>
          查看全部
          <ArrowUpRight size={15} />
        </button>
      }
    >
      <div className="project-counts">
        <div>
          <strong>{repos.length || "—"}</strong>
          <span>关注仓库</span>
        </div>
        <div>
          <strong>{prs.filter((p: any) => p.state === "open").length}</strong>
          <span>进行中的 PR</span>
        </div>
        <div>
          <strong>{prs.filter((p: any) => p.state === "merged").length}</strong>
          <span>近期已合并</span>
        </div>
      </div>
      <div className="pr-preview">
        {prs.slice(0, 2).map((p: any) => (
          <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
            <GitPullRequest size={17} className={p.state} />
            <span>
              <strong>{p.title}</strong>
              <small>
                {p.repo} #{p.number}
              </small>
            </span>
            <Badge value={p.state} />
          </a>
        ))}
        {!prs.length && (
          <Empty icon={GitPullRequest}>
            {source.status === "ok"
              ? "暂无参与的公开 PR"
              : "GitHub 数据等待同步"}
          </Empty>
        )}
      </div>
      <SourceNote source={source} />
    </Card>
  );
}

function NewsCard({
  source,
  onNavigate,
}: {
  source: Source;
  onNavigate: () => void;
}) {
  return (
    <Card
      title="AI 资讯"
      eyebrow="STAY CURIOUS"
      icon={Newspaper}
      action={
        <button className="text-btn" onClick={onNavigate}>
          更多资讯
          <ArrowUpRight size={15} />
        </button>
      }
    >
      <div className="news-preview">
        {(source.data?.items || []).slice(0, 3).map((n: any, i: number) => (
          <a key={n.url} href={n.url} target="_blank" rel="noopener noreferrer">
            <span className="news-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>
              <strong>{n.title}</strong>
              <small>
                {n.source}
                {n.published ? " · " + n.published : ""}
              </small>
            </span>
            <ArrowUpRight size={15} />
          </a>
        ))}
        {!source.data?.items?.length && (
          <Empty icon={Newspaper}>资讯等待同步</Empty>
        )}
      </div>
      <SourceNote source={source} />
    </Card>
  );
}

function Notifications({
  alerts,
  onClose,
  onSeen,
}: {
  alerts: Alert[];
  onClose: () => void;
  onSeen: () => void;
}) {
  const { ref, close } = useDialog(onClose);
  const [all, setAll] = useState(false);
  const size = useRows(400, 85, 6, 1);
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [all, size]);
  const list = alerts.filter((a) => all || !a.resolved);
  return (
    <dialog
      className="notifications"
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>
          <Bell size={19} />
          提醒中心
        </h2>
        <button className="icon-btn" onClick={close} aria-label="关闭提醒中心">
          <X size={20} />
        </button>
      </div>
      <div className="page-toolbar">
        <div className="segmented">
          <button
            className={!all ? "active" : ""}
            onClick={() => setAll(false)}
          >
            待关注
          </button>
          <button className={all ? "active" : ""} onClick={() => setAll(true)}>
            所有事件
          </button>
        </div>
        <button className="text-btn" onClick={onSeen}>
          <Check size={15} />
          全部已读
        </button>
      </div>
      {list.slice((page - 1) * size, page * size).map((a) => (
        <div
          className={`notification-item ${a.resolved ? "resolved" : ""}`}
          key={a.id}
        >
          {a.resolved ? (
            <CheckCircle2 size={19} />
          ) : (
            <TriangleAlert size={19} />
          )}
          <div>
            <h3>
              {a.title}
              {!a.seen && <i className="unread-dot" />}
            </h3>
            <p>{a.detail}</p>
            <small>
              {shortDate(a.created)} {timeText(a.created)}
              {a.resolved ? " · 已恢复 " + timeText(a.resolved) : " · 待关注"}
            </small>
          </div>
        </div>
      ))}
      <Pager page={page} total={list.length} size={size} onChange={setPage} />
      {!list.length && <Empty icon={ShieldCheck}>没有需要关注的事件</Empty>}
      <p className="muted small-text">
        提醒仅在此面板内展示；恢复记录保留 90 天。
      </p>
    </dialog>
  );
}

function App() {
  const appearance = useAppearance();
  const theme = appearance.theme;
  const [auth, setAuth] = useState<boolean | null>(null),
    [data, setData] = useState<Overview | null>(null),
    [config, setConfig] = useState<any>(null),
    [page, setPage] = useState(location.hash.slice(1) || "home"),
    [now, setNow] = useState(new Date()),
    [error, setError] = useState(""),
    [notifications, setNotifications] = useState(false),
    [course, setCourse] = useState<Course | null>(null),
    [menu, setMenu] = useState(false),
    [loading, setLoading] = useState(false),
    [nodeId, setNodeId] = useState("server");
  const pulse = usePulseHistory(
    data?.nodes.map((n) => n.id).join(",") || "",
    auth === true && page === "home",
  );
  const mounted = useRef(true);
  const requestId = useRef(0);
  function navigate(p: string) {
    location.hash = p;
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const refresh = useCallback(async () => {
    if (document.hidden) return;
    const serial = ++requestId.current;
    try {
      const [d, c] = await Promise.all([
        api<Overview>("/overview?node=" + encodeURIComponent(nodeId)),
        api("/config"),
      ]);
      if (mounted.current && serial === requestId.current) {
        setData(d);
        setConfig((previous: any) =>
          JSON.stringify(previous) === JSON.stringify(c) ? previous : c,
        );
        setError("");
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    }
  }, [nodeId]);
  useEffect(() => {
    mounted.current = true;
    api("/session")
      .then((s) => {
        setCsrf(s.csrf);
        setAuth(s.authenticated);
      })
      .catch(() => setError("无法连接服务器，请刷新重试"));
    const expired = () => {
      setAuth(false);
      setData(null);
      api("/session")
        .then((s) => setCsrf(s.csrf))
        .catch(() => {});
    };
    const hash = () => setPage(location.hash.slice(1) || "home");
    window.addEventListener("session-expired", expired);
    window.addEventListener("hashchange", hash);
    return () => {
      mounted.current = false;
      window.removeEventListener("session-expired", expired);
      window.removeEventListener("hashchange", hash);
    };
  }, []);
  useEffect(() => {
    if (!auth) return;
    refresh();
    const interval = setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [auth, refresh]);
  useEffect(() => {
    if (!auth) return;
    let live = true;
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const [stats, nodes] = await Promise.all([
          api("/stats?node=" + encodeURIComponent(nodeId)),
          api("/nodes"),
        ]);
        if (live)
          setData((previous) =>
            previous && previous.node_id === nodeId
              ? {
                  ...previous,
                  stats: { data: stats, ...stats.source },
                  nodes: nodes.items,
                }
              : previous,
          );
      } catch {}
    }, 10000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [auth, nodeId]);
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setNow(new Date());
    }, 15000);
    return () => clearInterval(id);
  }, []);
  const switchTheme = appearance.toggle;
  async function saveConfig(v: any) {
    await api("/config", "PUT", v);
    await refresh();
  }
  async function pinRepo(name: string) {
    try {
      const list = config.pinned_repos || [];
      const next = list.includes(name)
        ? list.filter((x: string) => x !== name)
        : [...list, name];
      await saveConfig({ pinned_repos: next });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (auth === null)
    return (
      <div className="app-loading">
        <img
          className="brand-mark"
          src={"/workbench-" + appearance.palette + ".svg"}
          alt="我的工作台"
        />
        <p>{error || "正在连接你的工作台…"}</p>
        {error && (
          <button className="secondary" onClick={() => location.reload()}>
            重新连接
          </button>
        )}
      </div>
    );
  if (!auth)
    return <Login onLogin={() => setAuth(true)} palette={appearance.palette} />;
  const active = data?.alerts.filter((a) => !a.resolved) || [];
  const unread = data?.alerts.filter((a) => !a.seen).length || 0;
  const title = NAV.find((n) => n[0] === page)?.[1] || "总览";
  const today = data ? dateKey(now, data.timezone) : dateKey(now);
  const week = data ? weekOf(today, data.calendar.semester_start) : 0;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a className="brand" href="#home">
          <img
            className="brand-mark"
            src={"/workbench-" + appearance.palette + ".svg"}
            alt="我的工作台"
          />
          <span>
            我的工作台<small>MY WORKSPACE</small>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {NAV.map(([key, label, Icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              aria-label={label}
              title={label}
              aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {key === "services" && active.length > 0 && (
                <em>{active.length}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">我</span>
            <span>
              朋友
              <small>我的工作台</small>
            </span>
            <button
              className="icon-btn"
              aria-label="退出登录"
              onClick={async () => {
                await api("/logout", "POST");
                setAuth(false);
                setData(null);
                const s = await api("/session");
                setCsrf(s.csrf);
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-backdrop"
          onClick={() => setMenu(false)}
          aria-label="关闭菜单"
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMenu(!menu)}
              aria-label="打开菜单"
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              工作空间<span>/</span>
              <strong>{title}</strong>
            </span>
          </div>
          <div className="top-actions">
            <span className="top-date">
              {today.replaceAll("-", ".")}
              <span className="live-clock">
                {timeText(now.toISOString(), data?.timezone)}
              </span>
            </span>
            <button
              className={`icon-btn ${loading ? "spinning" : ""}`}
              aria-label="刷新数据"
              onClick={async () => {
                setLoading(true);
                await refresh();
                setLoading(false);
              }}
            >
              <RefreshCw size={17} />
            </button>
            <AutoMenu className="palette-menu">
              <summary aria-label="外观配色">
                <span className="color-orb" />
              </summary>
              <div className="palette-popover">
                <PalettePicker
                  value={appearance.palette}
                  onChange={appearance.setPalette}
                />
              </div>
            </AutoMenu>
            <button
              className="icon-btn"
              onClick={switchTheme}
              aria-label={theme === "dark" ? "切换浅色主题" : "切换深色主题"}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-btn bell-button"
              onClick={() => setNotifications(true)}
              aria-label={`提醒中心，${unread} 条未读`}
            >
              <Bell size={18} />
              {unread > 0 && <i />}
            </button>
            <AutoMenu className="account-menu">
              <summary className="avatar small-avatar" aria-label="账号菜单">
                我
              </summary>
              <div className="palette-popover">
                <h3>我的工作台</h3>
                <p className="muted small-text">{config?.username}</p>
                <button
                  className="secondary"
                  onClick={async () => {
                    await api("/logout", "POST");
                    setAuth(false);
                    setData(null);
                    const s = await api("/session");
                    setCsrf(s.csrf);
                  }}
                >
                  退出登录
                </button>
              </div>
            </AutoMenu>
          </div>
        </header>
        <main className={page === "home" ? "home-view" : "detail-view"}>
          <div className="page-heading" key={page}>
            <div>
              <span className="eyebrow">
                {page === "home"
                  ? "A LITTLE CLARITY, EVERY DAY"
                  : "YOUR WORKSPACE"}
              </span>
              <h1>
                {page === "home" ? <Greeting /> : title}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {page === "home"
                  ? "今天的安排，正在运行的服务，还有值得关注的新进展。"
                  : {
                      calendar: "把每一天的安排，看得更清楚。",
                      services: "从实时指标到历史变化，了解你的数字基础设施。",
                      github: "跟进正在构建的项目，与开源世界保持连接。",
                      news: "收集有价值的新消息，留出时间继续创造。",
                      settings: "按你的习惯，组织这个工作空间。",
                    }[page] || ""}
              </p>
            </div>
            {page === "home" && (
              <HomeClock
                week={
                  week >= 1 && week <= (data?.calendar.semester_weeks || 20)
                    ? `第 ${week} 教学周`
                    : "学期外"
                }
              />
            )}
          </div>
          {error && (
            <div className="error-message global-error" role="alert">
              <TriangleAlert size={16} />
              {error} · 暂时保留上次数据
            </div>
          )}
          {!data || !config || data.node_id !== nodeId ? (
            <div className="loading-panel">
              <RefreshCw size={24} />
              <p>正在汇总课表与服务状态…</p>
            </div>
          ) : (
            <>
              {page === "home" && (
                <>
                  <MobileOverview
                    data={data}
                    pulse={pulse}
                    now={now}
                    onCourse={setCourse}
                    onNavigate={navigate}
                    onNode={(id) => {
                      setNodeId(id);
                      navigate("services");
                    }}
                    onSave={saveConfig}
                  />
                  <div className="home-bento">
                    <Today
                      calendar={data.calendar}
                      now={now}
                      onCourse={setCourse}
                      onNavigate={() => navigate("calendar")}
                    />
                    <DualHealth
                      data={data}
                      pulse={pulse}
                      onOpen={(id) => {
                        setNodeId(id);
                        navigate("services");
                      }}
                    />
                    <EntryBoard
                      entries={data.entries}
                      services={data.services}
                      onSave={saveConfig}
                    />
                    <ProjectSummary
                      source={data.github}
                      onNavigate={() => navigate("github")}
                    />
                    <NewsCard
                      source={data.news}
                      onNavigate={() => navigate("news")}
                    />
                  </div>
                </>
              )}
              {page === "calendar" && (
                <CalendarWorkspace
                  calendar={data.calendar}
                  now={now}
                  onCourse={setCourse}
                />
              )}
              {page === "services" && (
                <ServicesWorkspace data={data} onNode={setNodeId} />
              )}
              {page === "github" && (
                <GithubWorkspace
                  source={data.github}
                  pinned={config.pinned_repos || []}
                  onPin={pinRepo}
                />
              )}
              {page === "news" && <NewsWorkspace source={data.news} />}
              {page === "settings" && (
                <SettingsWorkspace
                  config={config}
                  onSave={saveConfig}
                  appearance={appearance}
                />
              )}
            </>
          )}
          <footer>
            <span>
              我的工作台 <em>/</em> MY WORKSPACE
            </span>
            <span>让信息井然，让日常从容。</span>
          </footer>
        </main>
      </div>
      {notifications && data && (
        <Notifications
          alerts={data.alerts}
          onClose={() => setNotifications(false)}
          onSeen={async () => {
            await api("/alerts/seen", "POST");
            await refresh();
          }}
        />
      )}
      {course && (
        <CourseDialog
          course={course}
          tz={data?.timezone || "Asia/Shanghai"}
          onClose={() => setCourse(null)}
        />
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
