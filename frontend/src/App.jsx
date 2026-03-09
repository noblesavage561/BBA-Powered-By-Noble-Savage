import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoonStar, RefreshCw, ServerCog, SunMedium } from "lucide-react";
import { GraphQLGatewayTile } from "./components/monitoring/GraphQLGatewayTile";
import { DatabasePoolTile } from "./components/monitoring/DatabasePoolTile";
import { RedisCacheTile } from "./components/monitoring/RedisCacheTile";
import { ProcessStream } from "./components/monitoring/ProcessStream";
import { AgentActivityTile } from "./components/monitoring/AgentActivityTile";
import { useSystemStream } from "./hooks/useSystemStream";

const GRAPHQL_URL = "/graphql";

const darkTheme = {
  "--bg": "#0A192F",
  "--bg-alt": "#112240",
  "--text": "#e6f1ff",
  "--muted": "#9fb3c8",
  "--accent": "#64FFDA",
  "--alert": "#F06292",
  "--glass": "rgba(255,255,255,0.09)",
  "--glass-strong": "rgba(255,255,255,0.16)",
};

const lightTheme = {
  "--bg": "#f4f8ff",
  "--bg-alt": "#dfe8ff",
  "--text": "#10233f",
  "--muted": "#4f647d",
  "--accent": "#0f9d88",
  "--alert": "#d93d77",
  "--glass": "rgba(255,255,255,0.62)",
  "--glass-strong": "rgba(255,255,255,0.85)",
};

const SYSTEM_HEALTH_QUERY = `
  query GetSystemHealth {
    health {
      status
      db_connected
      redis_connected
      timestamp
    }
    systemHealth {
      graphql {
        latencyMs
        requestsPerSecond
        errorRate
        historicalLatency
      }
      database {
        activeConnections
        maxConnections
        queryRate
        avgQueryTime
      }
      redis {
        hitRate
        memoryUsedMb
        memoryTotalMb
        keysCount
        connectedClients
      }
      agents {
        active
        pending
        completed
      }
      recent_logs {
        timestamp
        message
        type
        category
      }
    }
  }
`;

export function App() {
  const [isDark, setIsDark] = useState(true);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [logs, setLogs] = useState([]);

  useSystemStream({
    onHealthUpdate: (payload) => {
      setSnapshot((prev) => {
        if (!prev) {
          return prev;
        }
        return { ...prev, systemHealth: payload };
      });
      if (payload?.recent_logs?.length) {
        setLogs(payload.recent_logs);
      }
    },
    onLog: (log) => {
      setLogs((prev) => [log, ...prev].slice(0, 12));
    },
  });

  const themeVars = isDark ? darkTheme : lightTheme;

  const pulseScore = useMemo(() => {
    if (!snapshot?.health) {
      return 99.9;
    }
    const health = snapshot.health;
    let score = health.status === "healthy" ? 99.9 : 86.2;
    if (!health.db_connected) {
      score -= 7;
    }
    if (!health.redis_connected) {
      score -= 6;
    }
    return Math.max(50, +score.toFixed(1));
  }, [snapshot]);

  const executiveSummary = useMemo(() => {
    if (!snapshot?.systemHealth) {
      return {
        grade: "Pending",
        risk: "Assessing",
        recommendation: "Waiting for telemetry snapshot.",
      };
    }

    const gql = snapshot.systemHealth.graphql;
    const db = snapshot.systemHealth.database;
    const redis = snapshot.systemHealth.redis;

    let grade = "Excellent";
    let risk = "Low";
    let recommendation = "Operations are stable. Continue standard monitoring cadence.";

    if (gql.errorRate >= 1 || gql.latencyMs >= 300 || redis.hitRate < 85 || db.avgQueryTime >= 150) {
      grade = "Needs Attention";
      risk = "High";
      recommendation = "Activate incident protocol and assign engineering owner for immediate remediation.";
    } else if (gql.errorRate >= 0.25 || gql.latencyMs >= 180 || db.avgQueryTime >= 70) {
      grade = "Watch";
      risk = "Medium";
      recommendation = "Track for the next 30 minutes and prepare scale-up if trend continues.";
    }

    return { grade, risk, recommendation };
  }, [snapshot]);

  const circleOffset = 502 - (pulseScore / 100) * 502;

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(themeVars).forEach(([key, value]) => root.style.setProperty(key, value));
  }, [themeVars]);

  async function fetchSnapshot() {
    setIsRefreshing(true);
    setError("");
    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: SYSTEM_HEALTH_QUERY }),
      });
      if (!res.ok) {
        throw new Error(`GraphQL HTTP ${res.status}`);
      }
      const json = await res.json();
      if (json.errors?.length) {
        throw new Error(json.errors[0].message || "Query failed");
      }
      setSnapshot(json.data);
      if (json.data.systemHealth.recent_logs?.length) {
        setLogs(json.data.systemHealth.recent_logs);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSnapshot();
    const id = setInterval(fetchSnapshot, 5000);
    return () => clearInterval(id);
  }, []);

  const reconnectView = (
    <motion.section initial={false} animate={{ opacity: 1 }} className="rescue cmd-glass">
      <div className="rescue-graphic">(  x_x )</div>
      <h2>Service Maintenance in Progress</h2>
      <p>Telemetry stream is temporarily unavailable. Retry connection to continue live observability.</p>
      <button className="reconnect" onClick={fetchSnapshot}>
        <RefreshCw size={16} /> Reconnect
      </button>
      <code>{error}</code>
    </motion.section>
  );

  return (
    <div className="hub-shell">
      <motion.header initial={false} animate={{ opacity: 1, y: 0 }} className="hero cmd-glass">
        <div className="hero-top">
          <div className="brand-wrap">
            <div className="logo-glow" aria-hidden="true" />
            <div className="logo">BBA</div>
            <div>
              <h1>BBA Core Intelligence Hub</h1>
              <p>Executive command center for platform health, risk, and readiness.</p>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setIsDark((v) => !v)}>
            {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />} {isDark ? "Light" : "Dark"}
          </button>
        </div>

        <div className="hero-bottom">
          <div className="pulse-wrap cmd-glass-inner">
            <svg width="190" height="190" viewBox="0 0 200 200" className="pulse-svg">
              <circle cx="100" cy="100" r="80" className="track" />
              <circle cx="100" cy="100" r="80" className="progress" style={{ strokeDashoffset: circleOffset }} />
            </svg>
            <div className="pulse-copy">
              <div className="pulse-value">{pulseScore}%</div>
              <div className="pulse-label">System Health</div>
            </div>
          </div>

          <div className="status-pill">
            <span className={`live-dot ${isRefreshing ? "active" : "idle"}`} />
            <span>System Live</span>
          </div>
        </div>
      </motion.header>

      {error || !snapshot ? (
        reconnectView
      ) : (
        <>
          <section className="executive-brief cmd-glass">
            <div>
              <div className="micro-label">Executive Summary</div>
              <h3>Management Review Snapshot</h3>
              <p>{executiveSummary.recommendation}</p>
            </div>
            <div className="brief-badges">
              <div className="brief-badge">
                <span className="micro-label">Readiness</span>
                <strong>{executiveSummary.grade}</strong>
              </div>
              <div className="brief-badge">
                <span className="micro-label">Risk Level</span>
                <strong>{executiveSummary.risk}</strong>
              </div>
              <div className="brief-badge">
                <span className="micro-label">Health Score</span>
                <strong>{pulseScore.toFixed(1)}%</strong>
              </div>
            </div>
          </section>

          <section className="matrix cmd-matrix">
            <GraphQLGatewayTile
              latencyMs={snapshot.systemHealth.graphql.latencyMs}
              requestsPerSecond={snapshot.systemHealth.graphql.requestsPerSecond}
              errorRate={snapshot.systemHealth.graphql.errorRate}
              historicalData={snapshot.systemHealth.graphql.historicalLatency}
            />
            <DatabasePoolTile
              activeConnections={snapshot.systemHealth.database.activeConnections}
              maxConnections={snapshot.systemHealth.database.maxConnections}
              queryRate={snapshot.systemHealth.database.queryRate}
              avgQueryTime={snapshot.systemHealth.database.avgQueryTime}
            />
            <RedisCacheTile
              hitRate={snapshot.systemHealth.redis.hitRate}
              memoryUsedMb={snapshot.systemHealth.redis.memoryUsedMb}
              memoryTotalMb={snapshot.systemHealth.redis.memoryTotalMb}
              keysCount={snapshot.systemHealth.redis.keysCount}
              connectedClients={snapshot.systemHealth.redis.connectedClients}
            />
            <AgentActivityTile
              active={snapshot.systemHealth.agents.active}
              pending={snapshot.systemHealth.agents.pending}
              completed={snapshot.systemHealth.agents.completed}
            />
          </section>

          <ProcessStream logs={logs} />
        </>
      )}

      <footer className="micro-label footer-note">
        <ServerCog size={13} /> Updated {new Date().toLocaleTimeString()}
      </footer>
    </div>
  );
}
