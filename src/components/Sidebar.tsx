import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const navItems = [
  { to: '/', label: '📊 Analytics', end: true },
  { to: '/reports', label: '📈 Reports' },
  { to: '/data-sources', label: '🗂️ Data Sources' },
  { to: '/settings', label: '⚙️ Settings' },
]

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-name">BBA Suite</span>
        <span className="sidebar-brand-sub">Powered by Noble Savage</span>
      </div>
      <ul className="sidebar-nav">
        {navItems.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">v1.0.0</div>
    </nav>
  )
}
