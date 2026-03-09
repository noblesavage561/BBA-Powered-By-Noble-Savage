import { motion } from "framer-motion";
import { useMemo } from "react";
import { Bolt } from "lucide-react";

export function RedisCacheTile({ hitRate, memoryUsedMb, memoryTotalMb, keysCount, connectedClients }) {
  const status = useMemo(() => {
    if (hitRate < 70) {
      return "critical";
    }
    if (hitRate < 85) {
      return "warning";
    }
    return "healthy";
  }, [hitRate]);

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (hitRate / 100) * circumference;
  const memoryPercentage = (memoryUsedMb / Math.max(memoryTotalMb, 1)) * 100;

  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="tile cmd-glass">
      <header className="tile-head">
        <div className="tile-title-wrap">
          <Bolt size={18} />
          <div>
            <h3>Redis Cache</h3>
            <p>The Speed Layer</p>
          </div>
        </div>
      </header>

      <div className="gauge-wrap">
        <svg className="gauge" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" className="gauge-track" />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            className={`gauge-progress ${status}`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="gauge-copy">
          <span className={`gauge-value ${status}`}>{hitRate.toFixed(0)}%</span>
          <span>Hit Rate</span>
        </div>
      </div>

      <div className="tri-metrics">
        <div>
          <div className="micro-label">Memory</div>
          <div className="metric-small">{memoryUsedMb.toFixed(0)}/{memoryTotalMb}MB</div>
          <div className="capacity-track small"><div className="capacity-fill healthy" style={{ width: `${Math.min(memoryPercentage, 100)}%` }} /></div>
        </div>
        <div>
          <div className="micro-label">Keys</div>
          <div className="metric-small">{keysCount.toLocaleString()}</div>
        </div>
        <div>
          <div className="micro-label">Clients</div>
          <div className="metric-small">{connectedClients}</div>
        </div>
      </div>
    </motion.article>
  );
}
