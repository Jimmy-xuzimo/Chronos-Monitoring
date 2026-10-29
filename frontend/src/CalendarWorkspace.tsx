import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarData, Course } from "./types";
import { Tabs, Pager, useRows, Panel, Empty } from "./workspace";
const ms = 86400000;
const shift = (d: string, n: number) =>
  new Date(Date.parse(d + "T12:00:00Z") + n * ms).toISOString().slice(0, 10);
const time = (s: string, tz: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(s));
const onDay = (e: Course, d: string) =>
  e.date === d ||
  (e.date < d &&
    (e.all_day ? e.end.slice(0, 10) > d : e.end.slice(0, 10) >= d));
export default function CalendarWorkspace({
  calendar,
  now,
  onCourse,
}: {
  calendar: CalendarData;
  now: Date;
  onCourse: (c: Course) => void;
}) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: calendar.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [date, setDate] = useState(today),
    [view, setView] = useState(innerWidth < 720 ? "day" : "week"),
    [page, setPage] = useState(1),
    [source, setSource] = useState("all");
  const size = useRows(325, 48, 12);
  const weekLimit = useRows(350, 80, 6, 1);
  useEffect(() => setPage(1), [date, view, size, source]);
  const selected = new Date(date + "T12:00:00Z"),
    week =
      Math.floor(
        (Date.parse(date + "T12:00:00Z") -
          Date.parse(calendar.semester_start + "T12:00:00Z")) /
          (7 * ms),
      ) + 1;
  const first =
    view === "week"
      ? shift(date, -(selected.getUTCDay() + 6) % 7)
      : date.slice(0, 7) + "-01";
  const offset = (new Date(first + "T12:00:00Z").getUTCDay() + 6) % 7;
  const count = new Date(
    selected.getUTCFullYear(),
    selected.getUTCMonth() + 1,
    0,
  ).getDate();
  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => shift(first, i))
      : Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) =>
          shift(first, i - offset),
        );
  const events = calendar.events.filter(
      (e) => source === "all" || e.calendar_id === source,
    ),
    list = events.filter((e) => onDay(e, date));
  function step(n: number) {
    setDate(
      view === "month"
        ? new Date(
            Date.UTC(
              selected.getUTCFullYear(),
              selected.getUTCMonth() + n,
              1,
              12,
            ),
          )
            .toISOString()
            .slice(0, 10)
        : shift(date, n * (view === "week" ? 7 : 1)),
    );
  }
  return (
    <div className="workspace calendar-workspace">
      <div className="ws-toolbar">
        <Tabs
          items={[
            ["day", "日"],
            ["week", "周"],
            ["month", "月"],
          ]}
          value={view}
          onChange={setView}
        />
        <div className="ws-controls">
          <select
            aria-label="课表日历"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="all">全部日历</option>
            {calendar.sources.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="课表日期"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="secondary" onClick={() => setDate(today)}>
            今天
          </button>
          <button
            className="icon-btn"
            aria-label="上一期"
            onClick={() => step(-1)}
          >
            <ChevronLeft size={17} />
          </button>
          <button
            className="icon-btn"
            aria-label="下一期"
            onClick={() => step(1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="ws-caption">
        {date.slice(0, 7).replace("-", " 年 ")} 月 ·{" "}
        {week >= 1 && week <= calendar.semester_weeks
          ? "第 " + week + " 教学周"
          : "学期外，请检查订阅"}{" "}
        · {calendar.timezone}
        {calendar.sources.some((s) => s.status !== "ok") && (
          <span className="warn-text"> · 订阅暂未更新，以最近成功数据展示</span>
        )}
      </div>
      <Panel key={view + date + source} className="calendar-fixed-panel">
        {view === "day" ? (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>课程</th>
                  <th>教室</th>
                  <th className="secondary-col">教师 / 节次</th>
                </tr>
              </thead>
              <tbody>
                {list.slice((page - 1) * size, page * size).map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => onCourse(e)}
                    tabIndex={0}
                    onKeyDown={(x) => {
                      if (x.key === "Enter") onCourse(e);
                    }}
                  >
                    <td>
                      {e.untimed
                        ? "时间待定"
                        : time(e.start, calendar.timezone) +
                          "–" +
                          time(e.end, calendar.timezone)}
                    </td>
                    <td>
                      <span className="ws-title">
                        <span>
                          {e.title}
                          {e.warning && (
                            <small className="warn-text">{e.warning}</small>
                          )}
                        </span>
                      </span>
                    </td>
                    <td title={e.location}>{e.location || "地点待定"}</td>
                    <td className="secondary-col">
                      {e.teacher} · {e.periods || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && (
              <Empty>
                {calendar.sources.some((s) => s.status !== "ok")
                  ? "同步异常，暂不能确认当天安排"
                  : "今天没有固定课程"}
              </Empty>
            )}
          </div>
        ) : (
          <div className={"compact-calendar " + view}>
            <div className="compact-cal-head">
              {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                <span key={d}>周{d}</span>
              ))}
            </div>
            <div
              className="compact-cal-cells"
              style={{
                gridTemplateRows: `repeat(${view === "week" ? 1 : Math.ceil(days.length / 7)},minmax(0,1fr))`,
              }}
            >
              {days.map((d) => {
                const courses = events.filter((e) => onDay(e, d));
                const limit =
                  view === "week"
                    ? weekLimit
                    : Math.ceil(days.length / 7) >= 6 || innerHeight < 820
                      ? 1
                      : 2;
                return (
                  <div
                    className={
                      "compact-cal-cell " +
                      (d === today ? "today" : "") +
                      (view === "month" && d.slice(0, 7) !== date.slice(0, 7)
                        ? " other-month"
                        : "")
                    }
                    key={d}
                  >
                    <button
                      className="compact-date"
                      onClick={() => {
                        setDate(d);
                        setView("day");
                      }}
                    >
                      {view === "week"
                        ? d.slice(5).replace("-", "/")
                        : Number(d.slice(8))}
                      {d === today && <small>今天</small>}
                    </button>
                    <div className="compact-course-list">
                      {courses.slice(0, limit).map((e) => (
                        <button
                          key={e.id}
                          className="compact-course"
                          style={
                            {
                              "--course-color": "var(--accent)",
                            } as React.CSSProperties
                          }
                          onClick={() => onCourse(e)}
                          title={
                            e.title + " · " + e.location + " · " + e.teacher
                          }
                        >
                          <span>
                            {e.untimed
                              ? "时间待定"
                              : time(e.start, calendar.timezone)}
                          </span>
                          <strong>{e.title}</strong>
                          {view === "week" && (
                            <small>{e.location || "地点待定"}</small>
                          )}
                          {e.warning && <em>待确认</em>}
                        </button>
                      ))}
                      {courses.length > limit && (
                        <button
                          className="compact-more"
                          onClick={() => {
                            setDate(d);
                            setView("day");
                          }}
                        >
                          另 {courses.length - limit} 项 ↗
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>
      {view === "day" && (
        <Pager page={page} total={list.length} size={size} onChange={setPage} />
      )}
      <div className="ws-footnote">
        点击课程查看完整教师、地点、节次和备注；月份中更多课程可进入当天查看。
      </div>
    </div>
  );
}
