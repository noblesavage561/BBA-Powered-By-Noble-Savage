# BBA — Business Intelligence Suite
> Powered by Noble Savage

A full-featured Business Intelligence dashboard built with **React 19**, **TypeScript**, **Vite**, and **Recharts**.  
Four live pages — Analytics, Reports, Data Sources, Settings — all wired up and interactive, ready to test in a GitHub Codespace in under two minutes.

---

## 🚀 Step 1 — Open the Codespace

1. Navigate to the repository on GitHub:  
   **`https://github.com/noblesavage561/BBA-Powered-By-Noble-Savage`**

2. Click the green **`<> Code`** button → select the **`Codespaces`** tab → click  
   **"Create codespace on `copilot/build-code-space`"**  
   *(or whichever branch you want to test)*

3. Wait **~1–2 minutes** while GitHub automatically:
   - Spins up a cloud VS Code environment (Node 22)
   - Runs `npm install` to install all dependencies
   - **Starts the Vite dev server** (`npm run dev`) — no manual step needed

4. A notification appears bottom-right:  
   > *"Your application running on port 5173 is available."*

   Click **"Open in Browser"**  
   — or — open the **Ports** tab at the bottom of VS Code and click the 🌐 icon next to **5173**.

> **The app opens automatically** because `onAutoForward: openBrowser` is set in the devcontainer config.

---

## ✅ Step 2 — Complete Test Walkthrough (hit every trigger)

Paste this as your Copilot Chat prompt to kick the tires, or follow it manually:

---

### Prompt to paste into Copilot Chat inside the Codespace

```
Hey, let's kick the tires on this BBA app. Walk me through testing every interactive
trigger on each page of the running app at port 5173.
```

---

### Manual walkthrough — every trigger, in order

#### 📊 Page 1 — Analytics (`/`)
The dashboard loads automatically. Test these triggers:

| # | Trigger | What to do | Expected result |
|---|---------|------------|-----------------|
| 1 | **Revenue vs Expenses chart tooltip** | Hover over any data point on the area chart | Tooltip shows `$` values for Revenue and Expenses for that month |
| 2 | **Traffic by Channel pie tooltip** | Hover over any pie slice | Tooltip shows the channel name and its percentage |
| 3 | **Conversion Rate bar tooltip** | Hover over any bar in the bar chart | Tooltip shows `Conv. Rate` percentage for that week |
| 4 | **KPI cards** | Read the four cards at the top | Total Revenue `$767K`, Active Users `24,831`, Avg. Deal Size `$4,210`, Churn Rate `2.7%` each show a delta badge (green = up, red = down) |

---

#### 📋 Page 2 — Reports (`/reports`)
Click **Reports** in the left sidebar. Test these triggers:

| # | Trigger | What to do | Expected result |
|---|---------|------------|-----------------|
| 5 | **Search — by name** | Type `revenue` in the search box | Table filters to show only "Monthly Revenue Summary" and "Year-over-Year Growth" |
| 6 | **Search — by type** | Clear the box, type `marketing` | Table shows only "Q1 Conversion Funnel" |
| 7 | **Search — no results** | Type `zzz` | Table shows "No reports match your search." |
| 8 | **Clear search** | Delete all text in the search box | All 6 reports reappear |
| 9 | **Status badges** | Scan the Status column | "Ready" = green, "Running" = blue/yellow, "Failed" = red |
| 10 | **Run button** | Click **Run** on any row | Button is present and clickable (action not yet wired to backend) |
| 11 | **Export button** | Click **Export** on any row | Button is present and clickable |
| 12 | **New Report button** | Click **+ New Report** | Button is clickable (modal/form coming in future release) |

---

#### 🔌 Page 3 — Data Sources (`/data-sources`)
Click **Data Sources** in the left sidebar. Test these triggers:

| # | Trigger | What to do | Expected result |
|---|---------|------------|-----------------|
| 13 | **Disconnect a connected source** | Click **Disconnect** on "Production DB" | Card loses its connected highlight; button changes to **Connect**; status dot turns grey/offline |
| 14 | **Reconnect the source** | Click **Connect** on "Production DB" | Card regains its connected style; button changes back to **Disconnect**; status dot turns green |
| 15 | **Connect an offline source** | Click **Connect** on "CRM Export" | Card becomes connected; button switches to **Disconnect** |
| 16 | **Disconnect all sources** | Click **Disconnect** on every card | All four cards show offline state |
| 17 | **Sync Now button** | Click **Sync Now** on any card | Button is clickable (live sync wired in a future release) |
| 18 | **Add Data Source card** | Click the **＋ Add Data Source** card | Clickable card (form coming in a future release) |

---

#### ⚙️ Page 4 — Settings (`/settings`)
Click **Settings** in the left sidebar. Test these triggers:

| # | Trigger | What to do | Expected result |
|---|---------|------------|-----------------|
| 19 | **Workspace Name text field** | Click the "Noble Savage HQ" input and change the text | Field updates live as you type; "Save Changes" button becomes active again if it was previously saved |
| 20 | **Timezone dropdown** | Open the dropdown and select a different timezone | Selection updates immediately |
| 21 | **Email Reports toggle** | Click the toggle (currently ON) | Toggle switches to OFF |
| 22 | **Alert on Failures toggle** | Click the toggle (currently ON) | Toggle switches to OFF |
| 23 | **Weekly Digest toggle** | Click the toggle (currently OFF) | Toggle switches to ON |
| 24 | **Theme dropdown** | Change from "Dark" to "Light" or "System" | Selection updates immediately |
| 25 | **Compact Mode toggle** | Click the toggle (currently OFF) | Toggle switches to ON |
| 26 | **Save Changes button** | Click **Save Changes** | Button text changes to **✓ Saved** |
| 27 | **Re-edit after save** | Change any setting after clicking Save | Button reverts to **Save Changes** (unsaved state indicator resets) |

---

#### 🗺️ Sidebar navigation (runs across all pages)

| # | Trigger | What to do | Expected result |
|---|---------|------------|-----------------|
| 28 | **Analytics nav link** | Click the Analytics icon/label in the sidebar | URL changes to `/`; Analytics page renders |
| 29 | **Reports nav link** | Click the Reports icon/label | URL changes to `/reports` |
| 30 | **Data Sources nav link** | Click the Data Sources icon/label | URL changes to `/data-sources` |
| 31 | **Settings nav link** | Click the Settings icon/label | URL changes to `/settings` |
| 32 | **Active state highlight** | Observe the sidebar while navigating | The current page's link is visually highlighted |

---

## 💻 Running locally (without Codespaces)

Requires **Node.js 18+** and **npm**:

```bash
git clone https://github.com/noblesavage561/BBA-Powered-By-Noble-Savage.git
cd BBA-Powered-By-Noble-Savage
npm install
npm run dev
# → open http://localhost:5173
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## 🛠️ Tech Stack

| Layer | Library |
|-------|---------|
| UI | React 19 + TypeScript |
| Build | Vite 7 |
| Routing | React Router v7 |
| Charts | Recharts v3 |
| Linting | ESLint 9 |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Sidebar.tsx       # Navigation sidebar
│   └── Sidebar.css
├── pages/
│   ├── Analytics.tsx     # KPI cards + 3 Recharts charts
│   ├── Analytics.css
│   ├── Reports.tsx       # Searchable report table
│   ├── Reports.css
│   ├── DataSources.tsx   # Integration cards with connect/disconnect
│   ├── DataSources.css
│   ├── Settings.tsx      # Toggles, inputs, selects + save
│   └── Settings.css
├── shared.css            # Shared utility styles
├── App.tsx               # BrowserRouter + layout shell
└── main.tsx              # Entry point
```

---

© Noble Savage — BBA v1.0.0
