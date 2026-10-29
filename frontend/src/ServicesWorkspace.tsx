import { useState, useEffect } from "react";
import { useDialog } from "./useDialog";
import { X } from "lucide-react";
import { api } from "./api";
import type { Overview } from "./types";
import { Tabs, Pager, useRows, Status, Panel, Empty, bytes } from "./workspace";
function Plot({
  points,
  field,
  max,
}: {
  points: any[];
  field: string;
  max?: number;
}) {
  const high = max || Math.max(1, ...points.map((p) => p[field] || 0));
  return (
    <svg
      viewBox="0 0 600 120"
      preserveAspectRatio="none"
      role="img"
      aria-label={field + " 历史曲线"}
    >
      <g stroke="currentColor" opacity=".1">
        {[15, 45, 75, 105].map((y) => (
          <line key={y} x1="0" x2="600" y1={y} y2={y} />
        ))}
      </g>
      <path
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        d={points
          .map(
            (p, i) =>
              `${i ? "L" : "M"}${(i / Math.max(1, points.length - 1)) * 600},${105 - ((p[field] || 0) / high) * 90}`,
          )
          .join(" ")}
      />
    </svg>
  );
}
function HistoryDialog({
  service,
  onClose,
}: {
  service: any;
  onClose: () => void;
}) {
  const { ref, close } = useDialog(onClose);
  const size = useRows(380, 48, 8, 1);
  const [data, setData] = useState<any>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/services/" + service.id + "/history")
      .then((r) => active && setData(r))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [service.id]);
  return (
    <dialog
      ref={ref}
      className="service-history-dialog"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{service.name} · 最近 24 小时</h2>
        <button className="icon-btn" aria-label="关闭服务历史" onClick={close}>
          <X size={18} />
        </button>
      </div>
      <div className="ws-caption">
        正常比例 {data?.availability ?? "—"}% · 服务器探测 · 每 600 秒
      </div>
      {error && <div className="notice">{error}</div>}
      <table className="ws-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>状态</th>
            <th>HTTP</th>
            <th>响应</th>
          </tr>
        </thead>
        <tbody>
          {data?.checks.slice((page - 1) * size, page * size).map((c: any) => (
            <tr key={c.id}>
              <td>
                {new Date(c.ts * 1000).toLocaleTimeString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                  hour12: false,
                })}
              </td>
              <td>
                <Status value={c.status} />
              </td>
              <td>{c.code || "—"}</td>
              <td>{c.ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager
        page={page}
        total={data?.checks.length || 0}
        size={size}
        onChange={setPage}
      />
    </dialog>
  );
}
export default function ServicesWorkspace({
  data,
  onNode,
}: {
  data: Overview;
  onNode: (id: string) => void;
}) {
  const [tab, setTab] = useState("resources"),
    [range, setRange] = useState("24h"),
    [history, setHistory] = useState<any[]>([]),
    [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [error, setError] = useState(""),
    [corePage, setCorePage] = useState(1);
  const size = useRows(330, 38, 14);
  const [coreSize, setCoreSize] = useState(() => (innerWidth <= 720 ? 12 : 24));
  useEffect(() => {
    const fit = () => setCoreSize(innerWidth <= 720 ? 12 : 24);
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);
  const stats = data.stats.data;
  useEffect(() => setPage(1), [tab, size, data.node_id, query]);
  useEffect(() => setCorePage(1), [data.node_id, coreSize]);
  useEffect(() => {
    let active = true;
    setHistory([]);
    api("/history?node=" + data.node_id + "&range=" + range)
      .then((r) => {
        if (active) {
          setHistory(r.points);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [range, data.node_id]);
  useEffect(() => {
    if (tab !== "resources") return;
    let active = true;
    api("/history?node=" + data.node_id + "&range=" + range)
      .then((r) => active && setHistory(r.points))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [data.stats.updated]);
  const nodes = data.nodes;
  const rows =
    tab === "websites"
      ? data.services.items.filter((s) =>
          (s.name + s.url).toLowerCase().includes(query.toLowerCase()),
        )
      : tab === "storage"
        ? stats?.disks || []
        : tab === "network"
          ? stats?.net.ifaces || []
          : stats?.processes || [];
  const visible = rows.slice((page - 1) * size, page * size);
  const disk = stats
    ? Math.max(0, ...stats.disks.map((d: any) => d.percent))
    : 0;
  const info = stats
    ? [
        ["操作系统", stats.system.os],
        ["CPU", stats.system.cpu_model],
        ["公网 IP", stats.system.public_ip],
        [
          "运行时间",
          Math.floor(stats.system.uptime / 86400) +
            " 天 " +
            Math.floor((stats.system.uptime % 86400) / 3600) +
            " 小时",
        ],
        [
          "负载",
          stats.system.load.map((x: number) => x.toFixed(2)).join(" / ") ||
            "不适用",
        ],
        ["Swap", bytes(stats.swap.used) + " / " + bytes(stats.swap.total)],
        [
          "连接",
          stats.net.conns.est === null
            ? "权限不足"
            : stats.net.conns.est +
              " 已建立 / " +
              stats.net.conns.lsn +
              " 监听",
        ],
      ]
    : [];
  return (
    <div className="workspace">
      <div className="ws-toolbar services-toolbar">
        <select
          aria-label="监测设备"
          value={data.node_id}
          onChange={(e) => onNode(e.target.value)}
        >
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
        <Tabs
          items={[
            ["resources", "资源"],
            ["websites", "网站"],
            ["storage", "存储"],
            ["network", "网卡"],
            ["processes", "进程"],
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "resources" ? (
          <select
            aria-label="历史范围"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {["1h", "24h", "7d", "30d"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        ) : tab === "websites" ? (
          <input
            aria-label="搜索网站"
            placeholder="搜索网站"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        ) : null}
      </div>
      <div className="ws-caption">
        {tab === "websites"
          ? "服务器探测 · 每 600 秒"
          : `${stats?.system.hostname || "等待采集"} · ${stats?.system.cpu_cores || "—"} 核 · ${stats ? bytes(stats.mem.total) : "—"} 内存`}
        {data.stats.error && tab !== "websites" && (
          <span className="warn-text"> · {data.stats.error}</span>
        )}
        {error && <span className="warn-text"> · {error}</span>}
      </div>
      <Panel
        key={tab + page + data.node_id}
        className={tab === "resources" ? "resource-workspace" : ""}
      >
        {tab === "resources" ? (
          stats ? (
            <>
              <div className="ws-resource-values">
                {[
                  [
                    "CPU",
                    stats.cpu.total.toFixed(1) + "%",
                    stats.cpu.percpu.length + " 核",
                  ],
                  [
                    "内存",
                    stats.mem.percent.toFixed(1) + "%",
                    bytes(stats.mem.used) + " / " + bytes(stats.mem.total),
                  ],
                  [
                    "磁盘",
                    disk.toFixed(1) + "%",
                    stats.disks.length + " 个挂载点",
                  ],
                  [
                    "网络",
                    bytes(stats.net.rx) + "/s",
                    "↑ " + bytes(stats.net.tx) + "/s",
                  ],
                ].map(([k, v, sub]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <div className="ws-plots">
                {[
                  ["cpu", "CPU 使用率"],
                  ["mem", "内存使用率"],
                  ["rx", "网络下载"],
                  ["write", "磁盘写入"],
                ].map(([field, title]) => (
                  <div key={field}>
                    <span>{title}</span>
                    {history.length ? (
                      <Plot
                        points={history}
                        field={field}
                        max={["cpu", "mem"].includes(field) ? 100 : undefined}
                      />
                    ) : (
                      <Empty>历史数据正在积累</Empty>
                    )}
                  </div>
                ))}
              </div>
              <div className="ws-host-info">
                {info.map(([k, v]) => (
                  <div key={k} title={String(v)}>
                    <small>{k}</small>
                    <strong>{v || "—"}</strong>
                  </div>
                ))}
              </div>
              <div className="ws-core-section">
                <div className="ws-cores">
                  {stats.cpu.percpu
                    .slice((corePage - 1) * coreSize, corePage * coreSize)
                    .map((n: number, i: number) => (
                      <div
                        key={i}
                        title={"核心 " + ((corePage - 1) * coreSize + i + 1)}
                      >
                        <span>C{(corePage - 1) * coreSize + i + 1}</span>
                        <strong>{n}%</strong>
                        <i style={{ width: n + "%" }} />
                      </div>
                    ))}
                </div>
                {stats.cpu.percpu.length > coreSize && (
                  <div className="ws-core-pagination">
                    <span>
                      CPU 核心 · {corePage}/
                      {Math.ceil(stats.cpu.percpu.length / coreSize)}
                    </span>
                    <button
                      className="secondary"
                      disabled={corePage === 1}
                      onClick={() => setCorePage((p) => p - 1)}
                    >
                      上一组
                    </button>
                    <button
                      className="secondary"
                      disabled={
                        corePage >=
                        Math.ceil(stats.cpu.percpu.length / coreSize)
                      }
                      onClick={() => setCorePage((p) => p + 1)}
                    >
                      下一组
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Empty>等待节点首次上报</Empty>
          )
        ) : tab === "websites" ? (
          <div className="ws-table-wrap">
            <table className="ws-table service-dense">
              <thead>
                <tr>
                  <th>网站</th>
                  <th>状态</th>
                  <th>HTTP</th>
                  <th>响应</th>
                  <th className="secondary-col">证书剩余</th>
                  <th className="secondary-col">更新时间</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((s: any) => {
                  const v = s.data,
                    days = v?.cert_expires
                      ? Math.floor((v.cert_expires - Date.now() / 1000) / 86400)
                      : null;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSelected(s);
                      }}
                      title="点击查看探测历史"
                    >
                      <td>
                        <span className="ws-title">
                          <span>
                            {s.name}
                            <small>{new URL(s.url).hostname}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <Status
                          value={
                            s.status === "ok"
                              ? v?.status || "pending"
                              : s.status
                          }
                        />
                      </td>
                      <td>{v?.code || "—"}</td>
                      <td>{v ? v.ms + " ms" : "—"}</td>
                      <td
                        className={
                          "secondary-col " +
                          (days !== null && days <= 30 ? "warn-text" : "")
                        }
                      >
                        {days === null ? "—" : days + " 天"}
                      </td>
                      <td className="secondary-col">
                        {s.updated
                          ? new Date(s.updated * 1000).toLocaleTimeString(
                              "zh-CN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Shanghai",
                              },
                            )
                          : "等待中"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : tab === "storage" ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>挂载点 / 设备</th>
                  <th>已用 / 总量</th>
                  <th>使用率</th>
                  <th className="secondary-col">读取 / 写入</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((d: any) => (
                  <tr key={d.mount}>
                    <td>
                      <span className="ws-title">
                        <span>
                          {d.mount}
                          <small>{d.device}</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      {bytes(d.used)} / {bytes(d.total)}
                    </td>
                    <td>{d.percent}%</td>
                    <td className="secondary-col">
                      {bytes(d.io.r)}/s · {bytes(d.io.w)}/s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "network" ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>网卡 / 地址</th>
                  <th>上传</th>
                  <th>下载</th>
                  <th className="secondary-col">累计发送 / 接收</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((n: any) => (
                  <tr key={n.name}>
                    <td>
                      <span className="ws-title">
                        <span>
                          {n.name}
                          <small title={n.addresses.join(" · ")}>
                            {n.addresses.join(" · ")}
                          </small>
                        </span>
                      </span>
                    </td>
                    <td>{bytes(n.tx)}/s</td>
                    <td>{bytes(n.rx)}/s</td>
                    <td className="secondary-col">
                      {bytes(n.total_tx)} / {bytes(n.total_rx)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>进程</th>
                  <th>PID</th>
                  <th>CPU</th>
                  <th>内存</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p: any) => (
                  <tr key={p.pid}>
                    <td title={p.name}>{p.name}</td>
                    <td>{p.pid}</td>
                    <td>{p.cpu.toFixed(1)}%</td>
                    <td>{bytes(p.memory)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab !== "resources" && !visible.length && <Empty>暂无数据</Empty>}
      </Panel>
      {tab !== "resources" && (
        <Pager page={page} total={rows.length} size={size} onChange={setPage} />
      )}
      <div className="ws-footnote">
        {tab === "websites"
          ? "点击网站行查看历史与故障恢复记录。"
          : "资源每 10 秒更新 · 两节点历史独立保存"}
      </div>
      {selected && (
        <HistoryDialog service={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
