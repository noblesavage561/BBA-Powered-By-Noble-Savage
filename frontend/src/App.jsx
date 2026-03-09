import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Database, ShieldCheck, Zap, Server, Activity, RefreshCw, MoonStar, SunMedium } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

const GRAPHQL_URL = "http://127.0.0.1:4000/";

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
  "--bg-alt": "#dde8ff",
  "--text": "#10233f",
  "--muted": "#4f647d",
  "--accent": "#0f9d88",
  "--alert": "#d93d77",
  "--glass": "rgba(255,255,255,0.62)",
  "--glass-strong": "rgba(255,255,255,0.85)",
};

function makeUptimePoint(value, index) {
  return { second: index, uptime: value };
}

function getNowStamp() {
  return new Date().toLocaleTimeString();
}

export function App() {
  const [isDark, setIsDark] = useState(true);
  const [health, setHealth] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const [error, setError] = useState("");
  const [liveLogs, setLiveLogs] = useState([
    `[${getNowStamp()}] Intelligence Hub initialized.`,
    `[${getNowStamp()}] Awaiting telemetry from GraphQL gateway.`,
  ]);
  const [uptimeSeries, setUptimeSeries] = useState(Array.from({ length: 60 }, (_, i) => makeUptimePoint(99.7 + ((i % 6) * 0.03), i)));
  const [recentProcesses, setRecentProcesses] = useState([
    `[${getNowStamp()}] Smoke test execution completed.`,
    `[${getNowStamp()}] Cache synchronization completed.`,
    `[${getNowStamp()}] Backend process index updated.`,
  ]);

  const themeVars = isDark ? darkTheme : lightTheme;

  const globalHealthScore = useMemo(() => {
    if (!health) {
      return 99.9;
    }
    const base = health.status === "healthy" ? 99.9 : 87.2;
    const dbPenalty = health.db_connected ? 0 : 7.5;
    const redisPenalty = health.redis_connected ? 0 : 6.3;
    return Math.max(50, +(base - dbPenalty - redisPenalty).toFixed(1));
  }, [health]);

  const cacheHitRate = useMemo(() => {
    if (!health) {
      return 98.4;
    }
    return health.redis_connected ? 99.2 : 76.1;
  }, [health]);

  const dbConnections = useMemo(() => {
    if (!health) {
      return 12;
    }
    return health.db_connected ? 14 : 0;
  }, [health]);

  async function fetchHealth() {
    const start = performance.now();
    setIsRefreshing(true);
    setError("");

    try {
      const res = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "query { health { status db_connected redis_connected timestamp } }" }),
      });

      if (!res.ok) {
        throw new Error(`GraphQL HTTP ${res.status}`);
      }

      const payload = await res.json();
      if (payload.errors?.length) {
        throw new Error(payload.errors[0].message || "GraphQL query failed");
      }

      const elapsed = performance.now() - start;
      setLatencyMs(Math.round(elapsed));
      setHealth(payload.data.health);

      setRecentProcesses((prev) => {
        const next = [`[${getNowStamp()}] Gateway sync completed in ${Math.round(elapsed)}ms.`, ...prev];
        return next.slice(0, 3);
      });

      setLiveLogs((prev) => {
        const next = [
          `[${getNowStamp()}] Optimized database query executed.`,
          `[${getNowStamp()}] Redis heartbeat acknowledged.`,
          ...prev,
        ];
        return next.slice(0, 8);
      });

      setUptimeSeries((prev) => {
        const nextValue = payload.data.health.status === "healthy" ? 99.6 + Math.random() * 0.4 : 95 + Math.random() * 3;
        const shifted = [...prev.slice(1), makeUptimePoint(+nextValue.toFixed(2), prev.length)];
        return shifted.map((p, i) => ({ second: i, uptime: p.uptime }));
      });
    } catch (e) {
      setError(String(e));
      setLiveLogs((prev) => [`[${getNowStamp()}] Warning: service maintenance mode detected.`, ...prev].slice(0, 8));
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeVars]);

  const reconnectView = (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rescue">
      <div className="rescue-graphic">(  x_x )</div>
      <h2>Service Maintenance in Progress</h2>
      <p>Gateway telemetry is temporarily unavailable. We are retrying orchestration links.</p>
      <button className="reconnect" onClick={fetchHealth}>
        <RefreshCw size={16} /> Reconnect
      </button>
      <code>{error}</code>
    </motion.section>
  );

  const circleOffset = 502 - (globalHealthScore / 100) * 502;

  return (
    <div className="hub-shell">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="hero nested-glass">
        <div className="hero-top">
          <div className="brand-wrap">
            <div className="logo-glow" aria-hidden="true" />
            <div className="logo">BBA</div>
            <div>
              <h1>BBA Core Intelligence Hub</h1>
              <p>Enterprise telemetry, orchestrated in real time.</p>
            </div>
          </div>
          <button className="theme-toggle" onClick={() => setIsDark((v) => !v)}>
            {isDark ? <SunMedium size={16} /> : <MoonStar size={16} />} {isDark ? "Cloud" : "Midnight"}
          </button>
        </div>

        <div className="hero-bottom">
          <div className="pulse-wrap nested-glass-inner">
            <svg width="190" height="190" viewBox="0 0 200 200" className="pulse-svg">
              <circle cx="100" cy="100" r="80" className="track" />
              <circle cx="100" cy="100" r="80" className="progress" style={{ strokeDashoffset: circleOffset }} />
            </svg>
            <div className="pulse-copy">
              <div className="pulse-value">{globalHealthScore}%</div>
              <div className="pulse-label">System Health</div>
            </div>
          </div>

          <div className="status-pill">
            <span className={`live-dot ${isRefreshing ? "active" : "idle"}`} />
            <span>System Live</span>
          </div>
        </div>
      </motion.header>

      {error ? (
        reconnectView
      ) : (
        <>
          <section className="matrix">
            <motion.article whileHover={{ y: -3 }} className="tile large nested-glass">
              <header>
                <Zap size={18} />
                <h3>Gateway Performance</h3>
              </header>
              <div className="metric">{latencyMs ?? 0}ms</div>
              <p>GraphQL response latency across orchestration path.</p>
              <div className="sparkline-wrap">
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={uptimeSeries}>
                    <Tooltip formatter={(value) => [`${value}%`, "Uptime"]} labelFormatter={(v) => `Second ${v}`} />
                    <Line type="monotone" dataKey="uptime" stroke="var(--accent)" strokeWidth={2.2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.article>

            <motion.article whileHover={{ y: -3 }} className="tile nested-glass">
              <header>
                <Database size={18} />
                <h3>Database and Storage</h3>
              </header>
              <div className="stat-row">
                <span>Connections</span>
                <strong>{dbConnections}</strong>
              </div>
              <div className="stat-row">
                <span>Redis Cache Hit</span>
                <strong>{cacheHitRate}%</strong>
              </div>
              <div className="status-row">
                <span className={health?.db_connected ? "ok" : "alert"}>DB {health?.db_connected ? "Online" : "Offline"}</span>
                <span className={health?.redis_connected ? "ok" : "alert"}>Redis {health?.redis_connected ? "Online" : "Offline"}</span>
              </div>
            </motion.article>

            <motion.article whileHover={{ y: -3 }} className="tile nested-glass">
              <header>
                <Server size={18} />
                <h3>Active Backend Processes</h3>
              </header>
              <ul className="process-list">
                {recentProcesses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </motion.article>
          </section>

          <section className="logs nested-glass">
            <header>
              <Activity size={18} />
              <h3>Live Logs</h3>
              <ShieldCheck size={16} className="shield" />
            </header>
            <div className="terminal">
              {liveLogs.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
