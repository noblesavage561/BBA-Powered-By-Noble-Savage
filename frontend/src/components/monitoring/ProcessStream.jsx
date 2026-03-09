import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Cpu, Info, XCircle } from "lucide-react";

const typeConfig = {
  success: { icon: CheckCircle2, className: "healthy" },
  info: { icon: Info, className: "info" },
  warning: { icon: CircleAlert, className: "warning" },
  error: { icon: XCircle, className: "critical" },
};

export function ProcessStream({ logs }) {
  return (
    <section className="feed cmd-glass">
      <header className="feed-head">
        <div className="tile-title-wrap">
          <Cpu size={18} />
          <div>
            <h3>Neural Feed</h3>
            <p>Real-time system activity</p>
          </div>
        </div>
        <span className="micro-label">{logs.length} events</span>
      </header>

      <div className="feed-body">
        <AnimatePresence initial={false}>
          {logs.map((log, idx) => {
            const conf = typeConfig[log.type] || typeConfig.info;
            const Icon = conf.icon;
            return (
              <motion.div
                key={`${log.timestamp}-${idx}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className={`feed-row ${conf.className}`}
              >
                <Icon size={15} />
                <div className="feed-copy">
                  <div className="feed-meta">[{log.timestamp}] {log.category}</div>
                  <div>{log.message}</div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
