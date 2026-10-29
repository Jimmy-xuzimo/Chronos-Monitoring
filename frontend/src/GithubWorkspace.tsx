import { useState, useEffect } from "react";
import { Pin, ArrowUpRight, GitPullRequest } from "lucide-react";
import type { Source } from "./types";
import { Tabs, Pager, useRows, Status, Panel, Empty } from "./workspace";
export default function GithubWorkspace({
  source,
  pinned,
  onPin,
}: {
  source: Source;
  pinned: string[];
  onPin: (v: string) => void;
}) {
  const [tab, setTab] = useState("prs"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(1);
  const size = useRows(330, 41, 14);
  const data = source.data;
  useEffect(() => setPage(1), [tab, query, filter, size]);
  const repos = (data?.repos || [])
    .filter((r: any) =>
      (r.name + " " + (r.description || ""))
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort(
      (a: any, b: any) =>
        Number(pinned.includes(b.full_name)) -
        Number(pinned.includes(a.full_name)),
    );
  const prs = (data?.prs || []).filter(
    (p: any) =>
      (p.title + " " + p.repo).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "attention" &&
          p.state === "open" &&
          ["failure", "changes_requested", "requested"].includes(
            p.ci === "failure" ? p.ci : p.review,
          )) ||
        p.state === filter),
  );
  const releases = Object.entries(data?.releases || {})
    .filter(([, r]) => r)
    .map(([name, r]: any) => ({ name, ...r }));
  const rows = tab === "prs" ? prs : tab === "repos" ? repos : releases;
  const visible = rows.slice((page - 1) * size, page * size);
  return (
    <div className="workspace">
      <div className="ws-toolbar">
        <Tabs
          items={[
            ["prs", "参与的 PR"],
            ["repos", "公开仓库"],
            ["releases", "版本发布"],
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="ws-controls">
          <input
            aria-label="搜索 GitHub"
            placeholder="搜索项目 / PR"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {tab === "prs" && (
            <select
              aria-label="筛选 PR"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">全部状态</option>
              <option value="open">进行中</option>
              <option value="attention">待关注</option>
              <option value="merged">已合并</option>
              <option value="closed">已关闭</option>
            </select>
          )}
        </div>
      </div>
      <div className="ws-caption">
        @{data?.user || "未配置"} · {data?.repos?.length || 0} 个仓库 ·{" "}
        {prs.filter((p: any) => p.state === "open").length} 个近期进行中 PR
        {source.error && <span className="warn-text"> · {source.error}</span>}
      </div>
      <Panel key={tab + page}>
        {tab === "prs" ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Pull Request</th>
                  <th>状态</th>
                  <th>CI</th>
                  <th className="secondary-col">审阅</th>
                  <th className="secondary-col">更新</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      <a
                        className="ws-title"
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={p.title}
                      >
                        <GitPullRequest size={14} />
                        <span>
                          {p.title}
                          <small>
                            {p.repo} #{p.number}
                          </small>
                        </span>
                      </a>
                    </td>
                    <td>
                      <Status value={p.state} />
                    </td>
                    <td>
                      <Status value={p.ci} />
                    </td>
                    <td className="secondary-col">
                      <Status value={p.review} />
                    </td>
                    <td className="secondary-col">
                      {p.updated_at?.slice(5, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === "repos" ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>仓库 / 描述</th>
                  <th className="secondary-col">语言</th>
                  <th>Star</th>
                  <th>Issue</th>
                  <th>置顶</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r: any) => (
                  <tr key={r.full_name}>
                    <td>
                      <a
                        className="ws-title"
                        href={r.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={r.description || r.name}
                      >
                        <span>
                          {r.name}
                          <small>{r.description || "暂无描述"}</small>
                        </span>
                      </a>
                    </td>
                    <td className="secondary-col">{r.language || "—"}</td>
                    <td>{r.stargazers_count}</td>
                    <td>{r.open_issues_count}</td>
                    <td>
                      <button
                        className={
                          "icon-btn " +
                          (pinned.includes(r.full_name) ? "pinned" : "")
                        }
                        aria-label={"置顶 " + r.name}
                        onClick={() => onPin(r.full_name)}
                      >
                        <Pin size={14} />
                      </button>
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
                  <th>项目</th>
                  <th>版本</th>
                  <th>发布时间</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r: any) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>
                      <a
                        href={r.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.tag_name} <ArrowUpRight size={12} />
                      </a>
                    </td>
                    <td>{r.published_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!visible.length && (
          <Empty>{source.data ? "未配置 GitHub 数据源，或没有匹配的项目" : "等待 GitHub 同步"}</Empty>
        )}
      </Panel>
      <Pager page={page} total={rows.length} size={size} onChange={setPage} />
      <div className="ws-footnote">
        每轮补充最近 {data?.detail_limit || 1} 个进行中 PR 的审阅与
        CI，其他明确标注为未读取。
      </div>
    </div>
  );
}
