import { useState } from 'react'
import './Reports.css'

type Report = {
  id: number
  name: string
  type: string
  owner: string
  lastRun: string
  status: 'Ready' | 'Running' | 'Failed'
}

const REPORTS: Report[] = [
  { id: 1, name: 'Monthly Revenue Summary', type: 'Financial', owner: 'Noble Savage', lastRun: '2026-03-01', status: 'Ready' },
  { id: 2, name: 'Q1 Conversion Funnel', type: 'Marketing', owner: 'Analytics Team', lastRun: '2026-03-07', status: 'Ready' },
  { id: 3, name: 'Customer Churn Analysis', type: 'Customer Success', owner: 'Noble Savage', lastRun: '2026-03-10', status: 'Running' },
  { id: 4, name: 'Product Usage Heatmap', type: 'Product', owner: 'Product Team', lastRun: '2026-02-28', status: 'Ready' },
  { id: 5, name: 'Regional Sales Breakdown', type: 'Sales', owner: 'Sales Ops', lastRun: '2026-03-05', status: 'Failed' },
  { id: 6, name: 'Year-over-Year Growth', type: 'Financial', owner: 'Noble Savage', lastRun: '2026-03-08', status: 'Ready' },
]

const STATUS_CLASS: Record<Report['status'], string> = {
  Ready: 'badge-ready',
  Running: 'badge-running',
  Failed: 'badge-failed',
}

export default function Reports() {
  const [search, setSearch] = useState('')
  const filtered = REPORTS.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="page reports-page">
      <h1 className="page-title">Reports</h1>
      <p className="page-desc">View, schedule, and manage your business reports.</p>

      <div className="reports-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder="Search reports…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary">+ New Report</button>
      </div>

      <div className="reports-table-wrapper">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Last Run</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  No reports match your search.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="report-name">{r.name}</td>
                  <td>{r.type}</td>
                  <td>{r.owner}</td>
                  <td>{r.lastRun}</td>
                  <td>
                    <span className={`badge ${STATUS_CLASS[r.status]}`}>{r.status}</span>
                  </td>
                  <td>
                    <button className="btn-ghost">Run</button>
                    <button className="btn-ghost">Export</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
