import { useEffect, useState } from "react";
const zone = "Asia/Shanghai";
export function greeting(date: Date) {
  const h = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
  return h < 5
    ? "凌晨好"
    : h < 11
      ? "上午好"
      : h < 13
        ? "中午好"
        : h < 18
          ? "下午好"
          : h < 23
            ? "晚上好"
            : "深夜好";
}
function useTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}
export function Greeting() {
  return <>{greeting(useTime())}，朋友</>;
}
export default function HomeClock({ week }: { week: string }) {
  const now = useTime();
  return (
    <div className="home-clock" aria-label="中国标准时间">
      <time dateTime={now.toISOString()}>
        <strong>
          {new Intl.DateTimeFormat("en-GB", {
            timeZone: zone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23",
          }).format(now)}
        </strong>
        <span>
          {new Intl.DateTimeFormat("zh-CN", {
            timeZone: zone,
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          }).format(now)}
        </span>
      </time>
      <small>中国标准时间 · UTC+8 · {week}</small>
    </div>
  );
}
