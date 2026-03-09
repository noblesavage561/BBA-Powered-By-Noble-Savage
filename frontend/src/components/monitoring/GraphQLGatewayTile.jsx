import { motion } from "framer-motion";
import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Clock3, Server } from "lucide-react";

function SparklineChart({ data, status }) {
  const maxValue = Math.max(...data, 1);
  const height = 64;
  const points = data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = height - (value / maxValue) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const colorMap = {
    healthy: "#64FFDA",
    warning: "#FBBF24",
    critical: "#F06292",
  };

  const color = colorMap[status] || colorMap.healthy;

  return (
    <svg className="spark-svg" preserveAspectRatio="none" viewBox="0 0 100 64">
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} 100,${height}`} fill="url(#sparklineGradient)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GraphQLGatewayTile({ latencyMs, requestsPerSecond, errorRate, historicalData }) {
  const trend = useMemo(() => {
    if (historicalData.length < 10) {
      return "stable";
    }
    const recent = historicalData.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older = historicalData.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    if (recent > older) {
      return "up";
    }
    if (recent < older) {
      return "down";
    }
    return "stable";
  }, [historicalData]);

  const status = useMemo(() => {
    if (latencyMs > 500) {
      return "critical";
    }
    if (latencyMs > 200) {
      return "warning";
    }
    return "healthy";
  }, [latencyMs]);

  return (
    <motion.article initial={false} animate={{ opacity: 1, y: 0 }} className="tile tile-large cmd-glass">
      <header className="tile-head">
        <div className="tile-title-wrap">
          <Server size={18} />
          <div>
            <h3>GraphQL Gateway</h3>
            <p>The Heartbeat</p>
          </div>
        </div>
        <div className={`trend ${trend}`}>
          {trend === "up" && <ArrowUpRight size={14} />}
          {trend === "down" && <ArrowDownRight size={14} />}
          <span>{trend}</span>
        </div>
      </header>

      <div className="metric-line">
        <span className={`metric-big ${status}`}>{latencyMs}</span>
        <span className="metric-unit"><Clock3 size={13} /> ms avg</span>
      </div>

      <div className="spark-wrap">
        <SparklineChart data={historicalData} status={status} />
      </div>

      <div className="split-metrics">
        <div>
          <div className="micro-label">Request Volume</div>
          <div className="metric-small">{requestsPerSecond.toFixed(1)} <span>req/s</span></div>
        </div>
        <div>
          <div className="micro-label">Error Rate</div>
          <div className={`metric-small ${errorRate < 0.1 ? "healthy" : errorRate < 1 ? "warning" : "critical"}`}>{errorRate.toFixed(2)}%</div>
        </div>
      </div>
    </motion.article>
  );
}
