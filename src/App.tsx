import './App.css'

function App() {
  return (
    <div className="dashboard">
      <header className="header">
        <h1>BBA Business Intelligence Suite</h1>
        <p className="subtitle">Powered by Noble Savage</p>
      </header>
      <main className="main">
        <div className="card-grid">
          <div className="card">
            <h2>📊 Analytics</h2>
            <p>View and analyze your business data in real time.</p>
          </div>
          <div className="card">
            <h2>📈 Reports</h2>
            <p>Generate comprehensive reports for any date range.</p>
          </div>
          <div className="card">
            <h2>🗂️ Data Sources</h2>
            <p>Connect and manage your data sources seamlessly.</p>
          </div>
          <div className="card">
            <h2>⚙️ Settings</h2>
            <p>Configure your workspace and user preferences.</p>
          </div>
        </div>
      </main>
      <footer className="footer">
        <p>© {new Date().getFullYear()} Noble Savage — BBA v1.0.0</p>
      </footer>
    </div>
  )
}

export default App
