import {
  Server,
  Monitor,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
} from "lucide-react";
import PulseHistory, { type PulseData } from "./PulseHistory";
import type { Overview } from "./types";
const size = (n = 0) =>
  n >= 1048576
    ? (n / 1048576).toFixed(1) + " MB/s"
    : (n / 1024).toFixed(0) + " KB/s";
export default function DualHealth({
  data,
  onOpen,
  pulse,
}: {
  data: Overview;
  pulse: PulseData;
  onOpen: (id: string) => void;
}) {
  const normal = data.services.items.filter(
    (s) => s.status === "ok" && s.data?.status === "up",
  ).length;
  return (
    <section className="card node-health dual-health">
      <div className="card-head">
        <div>
          <div className="eyebrow">TWO DEVICES. ONE VIEW.</div>
          <h2>
            <Activity size={16} />
            设备脉搏
          </h2>
        </div>
        <span className="devices-status">
          {normal}/{data.services.items.length} 网站正常
        </span>
      </div>
      <div className="dual-nodes">
        {data.nodes.map((node: any) => (
          <button
            key={node.id}
            className={"dual-node " + node.status}
            onClick={() => onOpen(node.id)}
          >
            <div className="dual-node-head">
              <span className="dual-node-icon">
                {node.kind === "server" ? (
                  <Server size={19} />
                ) : (
                  <Monitor size={19} />
                )}
              </span>
              <div>
                <strong>{node.name}</strong>
                <small>
                  {node.cores || "—"} 核 ·{" "}
                  {node.memory
                    ? (node.memory / 1024 ** 3).toFixed(1) + " GB"
                    : "等待上报"}
                </small>
              </div>
              <span className={"node-status " + node.status}>
                <i />
                {node.status === "online" ? "在线" : "离线"}
              </span>
              <ArrowUpRight size={13} />
            </div>
            <div className="dual-metrics">
              {[
                ["CPU", node.cpu],
                ["内存", node.mem],
                ["磁盘", node.disk],
              ].map(([name, value]: any) => (
                <div key={name}>
                  <span>
                    {name}
                    <strong>
                      {value === null || value === undefined
                        ? "—"
                        : value.toFixed(1) + "%"}
                    </strong>
                  </span>
                  <div className="meter">
                    <i style={{ width: (value || 0) + "%" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="dual-net">
              <span>
                <ArrowUpRight size={11} />
                {size(node.tx)}
              </span>
              <span>
                <ArrowDownLeft size={11} />
                {size(node.rx)}
              </span>
              <small>
                {node.status === "online"
                  ? "运行 " + Math.floor((node.uptime || 0) / 86400) + " 天"
                  : "等待重新连接"}
              </small>
            </div>
            <PulseHistory data={pulse[node.id]} />
          </button>
        ))}
      </div>
    </section>
  );
}
