import { motion } from "framer-motion";
import { useMemo } from "react";
import { AlertTriangle, Database } from "lucide-react";

export function DatabasePoolTile({ activeConnections, maxConnections, queryRate, avgQueryTime }) {
  const usagePercentage = (activeConnections / Math.max(maxConnections, 1)) * 100;
  const status = useMemo(() => {
    if (usagePercentage > 80) {
      return "critical";
    }
    if (usagePercentage > 60) {
      return "warning";
    }
    return "healthy";
  }, [usagePercentage]);

  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tile cmd-glass">
      <header className="tile-head">
        <div className="tile-title-wrap">
          <Database size={18} />
          <div>
            <h3>Database Pool</h3>
            <p>The Foundation</p>
          </div>
        </div>
        {status === "critical" && (
          <div className="critical-pill">
            <AlertTriangle size={13} /> High Load
          </div>
        )}
      </header>

      <div className="metric-line compact">
        <span className="metric-big">{activeConnections}</span>
        <span className="metric-unit">/ {maxConnections} connections</span>
      </div>

      <div className="capacity-track">
        <div className={`capacity-fill ${status}`} style={{ width: `${Math.min(usagePercentage, 100)}%` }} />
      </div>
      <div className="micro-label right">{usagePercentage.toFixed(0)}% capacity used</div>

      <div className="split-metrics">
        <div>
          <div className="micro-label">Query Rate</div>
          <div className="metric-small">{queryRate.toFixed(0)} <span>q/s</span></div>
        </div>
        <div>
          <div className="micro-label">Avg Query Time</div>
          <div className={`metric-small ${avgQueryTime < 50 ? "healthy" : avgQueryTime < 200 ? "warning" : "critical"}`}>{avgQueryTime.toFixed(0)}ms</div>
        </div>
      </div>
    </motion.article>
  );
}
