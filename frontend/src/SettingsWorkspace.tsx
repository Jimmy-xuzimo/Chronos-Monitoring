import { useState, useEffect } from "react";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { api } from "./api";
import { PalettePicker } from "./appearance";
import { Tabs, Pager, useRows, Panel } from "./workspace";
export default function SettingsWorkspace({
  config,
  onSave,
  appearance,
}: {
  config: any;
  onSave: (v: any) => Promise<void>;
  appearance: any;
}) {
  const [tab, setTab] = useState("appearance"),
    [form, setForm] = useState<any>(structuredClone(config)),
    [page, setPage] = useState(1),
    [token, setToken] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [account, setAccount] = useState({
      current_password: "",
      new_username: "",
      new_password: "",
    });
  const size = useRows(
    430,
    innerWidth < 720 ? (tab === "entries" ? 145 : 115) : 44,
    10,
    1,
  );
  useEffect(() => setForm(structuredClone(config)), [config]);
  useEffect(() => {
    setPage(1);
    setMessage("");
  }, [tab, size]);
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const update = (key: string, i: number, k: string, v: any) => {
    const next = [...form[key]];
    next[i] = { ...next[i], [k]: v };
    set(key, next);
  };
  const key =
    tab === "calendar"
      ? "calendars"
      : tab === "websites"
        ? "services"
        : "entries";
  const list = ["calendar", "websites", "entries"].includes(tab)
    ? form[key]
    : [];
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (tab === "security") {
        await api("/credentials", "POST", account);
        setAccount({
          current_password: "",
          new_username: "",
          new_password: "",
        });
        setMessage("账号已更新，其他会话需要重新登录");
      } else {
        const payload =
          tab === "calendar"
            ? {
                calendars: form.calendars,
                semester_start: form.semester_start,
                semester_weeks: form.semester_weeks,
              }
            : tab === "websites"
              ? { services: form.services }
              : tab === "entries"
                ? { entries: form.entries }
                : tab === "retention"
                  ? { retention: form.retention }
                  : {
                      github_user: form.github_user,
                      news_url: form.news_url,
                      ...(token ? { github_token: token } : {}),
                    };
        await onSave(payload);
        setToken("");
        setMessage("设置已保存");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const add = () => {
    const id = crypto.randomUUID().slice(0, 8);
    set(key, [
      ...list,
      tab === "calendar"
        ? { id, name: "新日历", url: "", color: "#6e8bff" }
        : tab === "websites"
          ? { id, name: "新网站", url: "", expected: [200] }
          : { id, name: "新入口", url: "", group: "自托管服务", pinned: false },
    ]);
    setPage(Math.ceil((list.length + 1) / size));
  };
  return (
    <div className="workspace">
      <div className="ws-toolbar">
        <Tabs
          items={[
            ["appearance", "外观"],
            ["calendar", "课表"],
            ["websites", "网站"],
            ["entries", "入口"],
            ["sources", "数据源"],
            ["retention", "清理"],
            ["security", "安全"],
          ]}
          value={tab}
          onChange={setTab}
        />
        {["calendar", "websites", "entries"].includes(tab) && (
          <button className="secondary" onClick={add}>
            <Plus size={14} />
            添加
          </button>
        )}
      </div>
      <div className="ws-caption" role="status">
        {message ||
          {
            appearance: "九种风格 · 深浅色切换统一 900 毫秒非线性动画",
            calendar: "中国时区 · 颜色跟随主题 · 订阅地址留空保留",
            websites: "服务器探测 · 每 600 秒",
            entries: "收藏显示在总览首页，分组与顺序保存在服务器",
            sources: "凭证只保存在服务器，留空保留已有 Token",
            retention: "每周一 04:00 · 上海时间 · 最多延迟一周删除到期数据",
            security: "更新后其他会话需要重新登录",
          }[tab]}
      </div>
      <Panel key={tab}>
        <form className="ws-settings-form" onSubmit={submit}>
          {tab === "appearance" ? (
            <div className="ws-appearance">
              <div>
                <h2>选择工作台风格</h2>
                <PalettePicker
                  value={appearance.palette}
                  onChange={appearance.setPalette}
                />
              </div>
              <div className="ws-theme-choice">
                <h3>界面明暗</h3>
                <p>
                  当前为{appearance.theme === "dark" ? "深色" : "浅色"}
                  。切换按扩散、收回交替播放。
                </p>
                <button
                  type="button"
                  className="primary"
                  onClick={appearance.toggle}
                >
                  切换为{appearance.theme === "dark" ? "浅色" : "深色"}
                </button>
              </div>
            </div>
          ) : tab === "calendar" || tab === "websites" || tab === "entries" ? (
            <>
              {tab === "calendar" && (
                <div className="ws-settings-top">
                  <label>
                    第 1 周开始
                    <input
                      type="date"
                      value={form.semester_start}
                      onChange={(e) => set("semester_start", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    教学周数
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={form.semester_weeks}
                      onChange={(e) =>
                        set("semester_weeks", Number(e.target.value))
                      }
                    />
                  </label>
                </div>
              )}
              <div className="ws-edit-list">
                {list
                  .slice((page - 1) * size, page * size)
                  .map((row: any, n: number) => {
                    const i = (page - 1) * size + n;
                    return (
                      <div className={"ws-edit-row " + tab} key={row.id}>
                        <input
                          aria-label={"名称 " + (i + 1)}
                          required
                          value={row.name}
                          onChange={(e) =>
                            update(key, i, "name", e.target.value)
                          }
                        />
                        <input
                          aria-label={"地址 " + (i + 1)}
                          type="url"
                          required={tab !== "calendar" || !row.configured}
                          value={row.url || ""}
                          placeholder={
                            row.configured ? "已配置，留空保留" : "https://…"
                          }
                          onChange={(e) =>
                            update(key, i, "url", e.target.value)
                          }
                        />
                        {tab === "calendar" ? null : tab === "websites" ? (
                          <input
                            aria-label={"预期状态码 " + (i + 1)}
                            value={row.expectedText ?? row.expected.join(",")}
                            onChange={(e) => {
                              const next = [...list];
                              next[i] = {
                                ...row,
                                expectedText: e.target.value,
                                expected: e.target.value.split(",").map(Number),
                              };
                              set(key, next);
                            }}
                          />
                        ) : (
                          <>
                            <input
                              aria-label={"分组 " + (i + 1)}
                              required
                              value={row.group}
                              onChange={(e) =>
                                update(key, i, "group", e.target.value)
                              }
                            />
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={!!row.pinned}
                                onChange={(e) =>
                                  update(key, i, "pinned", e.target.checked)
                                }
                              />
                              收藏
                            </label>
                            <select
                              aria-label={"关联服务 " + (i + 1)}
                              value={row.service || ""}
                              onChange={(e) =>
                                update(key, i, "service", e.target.value)
                              }
                            >
                              <option value="">无关联</option>
                              {form.services.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={"上移 " + row.name}
                              disabled={i === 0}
                              onClick={() => {
                                const a = [...list];
                                [a[i - 1], a[i]] = [a[i], a[i - 1]];
                                set(key, a);
                              }}
                            >
                              <ArrowUp size={13} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={"下移 " + row.name}
                              disabled={i === list.length - 1}
                              onClick={() => {
                                const a = [...list];
                                [a[i + 1], a[i]] = [a[i], a[i + 1]];
                                set(key, a);
                              }}
                            >
                              <ArrowDown size={13} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={"删除 " + row.name}
                          onClick={() => {
                            const next = list.filter(
                              (_: any, j: number) => j !== i,
                            );
                            set(key, next);
                            setPage((p) =>
                              Math.min(
                                p,
                                Math.max(1, Math.ceil(next.length / size)),
                              ),
                            );
                          }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : tab === "sources" ? (
            <div className="ws-settings-fields">
              <label>
                GitHub 用户名
                <input
                  placeholder="留空停用"
                  value={form.github_user}
                  onChange={(e) => set("github_user", e.target.value)}
                />
              </label>
              <label>
                GitHub Token
                <input
                  type="password"
                  autoComplete="off"
                  value={token}
                  placeholder={
                    form.github_token_set ? "已配置，留空保留" : "可选"
                  }
                  onChange={(e) => setToken(e.target.value)}
                />
              </label>
              <label>
                AI 资讯站
                <input
                  placeholder="留空停用"
                  type="url"
                  value={form.news_url}
                  onChange={(e) => set("news_url", e.target.value)}
                />
              </label>
              <div className="ws-config-actions">
                {form.github_token_set && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={async () => {
                      try {
                        await onSave({ github_token: "" });
                        setMessage("Token 已移除");
                      } catch (e) {
                        setMessage((e as Error).message);
                      }
                    }}
                  >
                    移除 Token
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    try {
                      await api("/news/sync", "POST");
                      setMessage("已请求资讯同步");
                    } catch (e) {
                      setMessage((e as Error).message);
                    }
                  }}
                >
                  读取资讯
                </button>
              </div>
              <p className="ws-footnote">
                资讯每天 07:30 读取，未发布时每 15 分钟重试；GitHub 每 15
                分钟更新。
              </p>
            </div>
          ) : tab === "retention" ? (
            <div className="ws-settings-fields">
              {[
                ["raw_days", "原始资源数据", 1, 30],
                ["history_days", "历史汇总", 7, 365],
                ["event_days", "探测与已恢复事件", 7, 365],
                ["news_days", "资讯归档", 7, 365],
              ].map(([k, label, min, max]) => (
                <label key={k}>
                  {label}（天）
                  <input
                    type="number"
                    required
                    min={min}
                    max={max}
                    value={form.retention[k]}
                    onChange={(e) =>
                      set("retention", {
                        ...form.retention,
                        [k]: Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
              <p className="ws-footnote">
                未恢复告警、账号、订阅和设备凭证保留。资源每 10 秒采集，网站每
                600 秒探测。
              </p>
            </div>
          ) : (
            <div className="ws-settings-fields">
              <label>
                当前密码
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={account.current_password}
                  onChange={(e) =>
                    setAccount({ ...account, current_password: e.target.value })
                  }
                />
              </label>
              <label>
                新账号
                <input
                  value={account.new_username}
                  autoComplete="username"
                  placeholder="留空保留"
                  onChange={(e) =>
                    setAccount({ ...account, new_username: e.target.value })
                  }
                />
              </label>
              <label>
                新密码
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  value={account.new_password}
                  placeholder="至少 10 位，留空保留"
                  onChange={(e) =>
                    setAccount({ ...account, new_password: e.target.value })
                  }
                />
              </label>
            </div>
          )}
          {tab !== "appearance" && (
            <div className="ws-settings-submit">
              <span>配置保存在服务器</span>
              <button className="primary" disabled={busy}>
                {busy ? "保存中…" : "保存设置"}
              </button>
            </div>
          )}
        </form>
      </Panel>
      {["calendar", "websites", "entries"].includes(tab) && (
        <Pager page={page} total={list.length} size={size} onChange={setPage} />
      )}
    </div>
  );
}
