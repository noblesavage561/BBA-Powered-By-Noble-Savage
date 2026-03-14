import { useState } from 'react'
import './DataSources.css'

type DataSource = {
  id: number
  name: string
  type: string
  host: string
  connected: boolean
  lastSync: string
}

const INITIAL_SOURCES: DataSource[] = [
  { id: 1, name: 'Production DB', type: 'PostgreSQL', host: 'db.prod.internal', connected: true, lastSync: '2026-03-14 16:00' },
  { id: 2, name: 'Analytics DW', type: 'BigQuery', host: 'project.dataset.bq', connected: true, lastSync: '2026-03-14 15:30' },
  { id: 3, name: 'CRM Export', type: 'CSV / S3', host: 's3://bba-exports/crm', connected: false, lastSync: '2026-03-12 09:00' },
  { id: 4, name: 'Marketing API', type: 'REST API', host: 'api.marketo.com', connected: true, lastSync: '2026-03-14 14:45' },
]

export default function DataSources() {
  const [sources, setSources] = useState(INITIAL_SOURCES)

  function toggleConnection(id: number) {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, connected: !s.connected } : s)),
    )
  }

  return (
    <div className="page data-sources-page">
      <h1 className="page-title">Data Sources</h1>
      <p className="page-desc">Connect and manage your external data integrations.</p>

      <div className="ds-grid">
        {sources.map((src) => (
          <div key={src.id} className={`ds-card ${src.connected ? 'connected' : ''}`}>
            <div className="ds-card-header">
              <span className="ds-name">{src.name}</span>
              <span className={`ds-status-dot ${src.connected ? 'online' : 'offline'}`} />
            </div>
            <div className="ds-type">{src.type}</div>
            <div className="ds-host">{src.host}</div>
            <div className="ds-sync">Last sync: {src.lastSync}</div>
            <div className="ds-actions">
              <button
                className={`btn-toggle ${src.connected ? 'disconnect' : 'connect'}`}
                onClick={() => toggleConnection(src.id)}
              >
                {src.connected ? 'Disconnect' : 'Connect'}
              </button>
              <button className="btn-ghost">Sync Now</button>
            </div>
          </div>
        ))}

        <div className="ds-card ds-add">
          <span className="ds-add-icon">＋</span>
          <span className="ds-add-label">Add Data Source</span>
        </div>
      </div>
    </div>
  )
}
