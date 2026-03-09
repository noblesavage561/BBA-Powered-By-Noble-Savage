import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown rendering error",
    };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard render failure", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-shell">
          <section className="error-boundary-card cmd-glass">
            <p className="micro-label">Noble Savage Financial Intelligence Suite</p>
            <h1>Systems Re-calibrating</h1>
            <p>
              The command center encountered a temporary rendering fault. Core services are still online,
              and the interface is initiating a safe recovery cycle.
            </p>
            <button className="reconnect" onClick={() => window.location.reload()}>
              Reload Command Center
            </button>
            {this.state.message ? <code>{this.state.message}</code> : null}
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
