import { motion } from "framer-motion";
import { Bot, CheckCircle2, Clock3, RefreshCw } from "lucide-react";

export function AgentActivityTile({ active, pending, completed }) {
  const tasks = [
    {
      id: "a1",
      agent: "FinancialAgent",
      action: "Categorizing transaction batch",
      status: "running",
      progress: 68,
    },
    {
      id: "a2",
      agent: "ComplianceAgent",
      action: "Reviewing notice package",
      status: "pending",
      progress: 0,
    },
    {
      id: "a3",
      agent: "ExecutiveStrategist",
      action: "Drafting treatment matrix",
      status: "completed",
      progress: 100,
    },
  ];

  return (
    <motion.article initial={false} animate={{ opacity: 1, y: 0 }} className="tile cmd-glass">
      <header className="tile-head">
        <div className="tile-title-wrap">
          <Bot size={18} />
          <div>
            <h3>Agent Orchestration</h3>
            <p>Voltron Layer</p>
          </div>
        </div>
      </header>

      <div className="triple-status">
        <div><strong>{active}</strong><span>Running</span></div>
        <div><strong>{pending}</strong><span>Pending</span></div>
        <div><strong>{completed}</strong><span>Done</span></div>
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <div key={task.id} className="task-row">
            <div className="task-head">
              <span>{task.agent}</span>
              {task.status === "running" && <span className="healthy"><RefreshCw size={12} /> Running</span>}
              {task.status === "pending" && <span className="warning"><Clock3 size={12} /> Queued</span>}
              {task.status === "completed" && <span className="healthy"><CheckCircle2 size={12} /> Done</span>}
            </div>
            <p>{task.action}</p>
            {task.status === "running" && (
              <div className="capacity-track small">
                <div className="capacity-fill healthy" style={{ width: `${task.progress}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.article>
  );
}
