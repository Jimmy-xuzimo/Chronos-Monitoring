import { Server, Monitor, Check } from "lucide-react";
import type { Overview } from "./types";
export default function NodeSwitch({
  data,
  onChange,
}: {
  data: Overview;
  onChange: (id: string) => void;
}) {
  return (
    <div className="node-switch" aria-label="选择监测设备">
      {data.nodes.map((n) => (
        <button
          key={n.id}
          className={"node-option " + (n.id === data.node_id ? "selected" : "")}
          onClick={() => onChange(n.id)}
          aria-pressed={n.id === data.node_id}
        >
          <span className="node-icon">
            {n.kind === "server" ? <Server size={20} /> : <Monitor size={20} />}
          </span>
          <span className="node-copy">
            <strong>{n.name}</strong>
            <small>
              {n.cores
                ? `${n.cores} 核 · ${((n.memory || 0) / 1024 ** 3).toFixed(1)} GB`
                : "等待首次上报"}
              {n.cpu !== null && n.cpu !== undefined
                ? ` · CPU ${n.cpu.toFixed(1)}%`
                : ""}
            </small>
          </span>
          <span className={"node-status " + n.status}>
            <i />
            {n.status === "online" ? "在线" : "离线"}
          </span>
          {n.id === data.node_id && <Check size={15} className="node-check" />}
        </button>
      ))}
    </div>
  );
}
