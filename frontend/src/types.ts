export type Course = {
  id: string;
  uid: string;
  calendar_id: string;
  calendar: string;
  color: string;
  title: string;
  start: string;
  end: string;
  date: string;
  all_day: boolean;
  untimed: boolean;
  location: string;
  description: string;
  teacher: string;
  periods: string;
  week: number | null;
  warning: string;
};
export type Source<T = any> = {
  data: T | null;
  status: "pending" | "ok" | "stale" | "error";
  updated: number | null;
  attempted: number | null;
  error: string | null;
};
export type CalendarData = {
  events: Course[];
  sources: ({ id: string; name: string; color: string } & Omit<
    Source,
    "data"
  >)[];
  timezone: string;
  semester_start: string;
  semester_weeks: number;
};
export type Alert = {
  id: number;
  key: string;
  title: string;
  detail: string;
  severity: string;
  created: number;
  resolved: number | null;
  seen: number;
};
export type Entry = {
  id: string;
  name: string;
  group: string;
  url: string;
  service?: string;
  pinned?: boolean;
};
export type Overview = {
  node_id: string;
  nodes: {
    id: string;
    name: string;
    kind: string;
    updated: number | null;
    status: string;
    cores?: number;
    memory?: number;
    cpu?: number;
    mem?: number;
  }[];
  stats: Source;
  collector: Source;
  calendar: CalendarData;
  services: {
    items: (Source & { id: string; name: string; url: string })[];
    probe_location: string;
  };
  github: Source;
  news: Source;
  alerts: Alert[];
  entries: Entry[];
  timezone: string;
  server_time: number;
};
