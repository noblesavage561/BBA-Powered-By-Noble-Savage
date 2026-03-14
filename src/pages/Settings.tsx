import { useState } from 'react'
import './Settings.css'

type SettingSection = {
  title: string
  items: SettingItem[]
}

type SettingItem = {
  id: string
  label: string
  description: string
  type: 'toggle' | 'text' | 'select'
  value: string | boolean
  options?: string[]
}

const INITIAL_SECTIONS: SettingSection[] = [
  {
    title: 'Workspace',
    items: [
      { id: 'name', label: 'Workspace Name', description: 'Display name for your BBA workspace.', type: 'text', value: 'Noble Savage HQ' },
      { id: 'timezone', label: 'Timezone', description: 'All dates and times will use this timezone.', type: 'select', value: 'UTC-5 (Eastern)', options: ['UTC', 'UTC-5 (Eastern)', 'UTC-6 (Central)', 'UTC-7 (Mountain)', 'UTC-8 (Pacific)'] },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { id: 'email_reports', label: 'Email Reports', description: 'Receive scheduled reports via email.', type: 'toggle', value: true },
      { id: 'alert_failures', label: 'Alert on Failures', description: 'Send an alert when a report or sync fails.', type: 'toggle', value: true },
      { id: 'weekly_digest', label: 'Weekly Digest', description: 'Receive a weekly analytics digest.', type: 'toggle', value: false },
    ],
  },
  {
    title: 'Appearance',
    items: [
      { id: 'theme', label: 'Theme', description: 'Choose the color theme for your dashboard.', type: 'select', value: 'Dark', options: ['Dark', 'Light', 'System'] },
      { id: 'compact', label: 'Compact Mode', description: 'Reduce spacing for a denser layout.', type: 'toggle', value: false },
    ],
  },
]

export default function Settings() {
  const [sections, setSections] = useState(INITIAL_SECTIONS)
  const [saved, setSaved] = useState(false)

  function updateItem(sectionTitle: string, itemId: string, newValue: string | boolean) {
    setSections((prev) =>
      prev.map((sec) =>
        sec.title === sectionTitle
          ? { ...sec, items: sec.items.map((item) => (item.id === itemId ? { ...item, value: newValue } : item)) }
          : sec,
      ),
    )
    setSaved(false)
  }

  function handleSave() {
    setSaved(true)
  }

  return (
    <div className="page settings-page">
      <div className="settings-header-row">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-desc">Configure your workspace and preferences.</p>
        </div>
        <button className="btn-primary" onClick={handleSave}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="settings-section">
          <h2 className="settings-section-title">{sec.title}</h2>
          {sec.items.map((item) => (
            <div key={item.id} className="settings-row">
              <div className="settings-info">
                <span className="settings-label">{item.label}</span>
                <span className="settings-desc">{item.description}</span>
              </div>
              <div className="settings-control">
                {item.type === 'toggle' && (
                  <button
                    role="switch"
                    aria-checked={item.value as boolean}
                    className={`toggle ${item.value ? 'on' : 'off'}`}
                    onClick={() => updateItem(sec.title, item.id, !item.value)}
                  >
                    <span className="toggle-knob" />
                  </button>
                )}
                {item.type === 'text' && (
                  <input
                    className="settings-input"
                    type="text"
                    value={item.value as string}
                    onChange={(e) => updateItem(sec.title, item.id, e.target.value)}
                  />
                )}
                {item.type === 'select' && (
                  <select
                    className="settings-select"
                    value={item.value as string}
                    onChange={(e) => updateItem(sec.title, item.id, e.target.value)}
                  >
                    {item.options!.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
