# BBA — Business Intelligence Suite
> Powered by Noble Savage

A full-featured Business Intelligence dashboard built with **React 19**, **TypeScript**, **Vite**, and **Recharts**.  
Includes Analytics, Reports, Data Sources, and Settings pages — all inside a GitHub Codespace that's ready to run in seconds.

---

## 🚀 Opening the Codespace (fastest way to run the app)

1. **Go to the repository on GitHub**  
   `https://github.com/noblesavage561/BBA-Powered-By-Noble-Savage`

2. **Click the green `<> Code` button** near the top-right of the file list.

3. **Select the `Codespaces` tab**, then click **"Create codespace on main"**  
   (or choose the branch you want, e.g. `copilot/build-code-space`).

4. **Wait ~1–2 minutes** while GitHub:
   - Spins up a cloud VS Code environment
   - Installs Node 22 and all `npm` dependencies automatically (`postCreateCommand: npm install`)

5. **Start the dev server** — in the integrated terminal that opens, run:
   ```bash
   npm run dev
   ```

6. **Open the app in your browser**  
   A notification will pop up in the bottom-right corner:  
   > *"Your application running on port 5173 is available."*  
   
   Click **"Open in Browser"** — or go to the **Ports** panel (bottom bar → `PORTS` tab) and click the 🌐 globe icon next to port **5173**.

> **Tip:** The devcontainer is configured with `"onAutoForward": "openBrowser"`, so the browser tab may open automatically the moment the dev server starts.

---

## 💻 Running locally (without Codespaces)

Make sure you have **Node.js 18+** and **npm** installed, then:

```bash
# 1. Clone the repo
git clone https://github.com/noblesavage561/BBA-Powered-By-Noble-Savage.git
cd BBA-Powered-By-Noble-Savage

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Other useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server with hot-reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all source files |

---

## 🗂️ Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Analytics | KPI cards + Revenue/Channel/Conversion charts |
| `/reports` | Reports | Searchable report table with status badges |
| `/data-sources` | Data Sources | Connected integrations with toggle controls |
| `/settings` | Settings | Workspace, notification, and appearance settings |

---

## 🛠️ Tech Stack

- **React 19** + **TypeScript**
- **Vite 7** — lightning-fast dev server & build tool
- **React Router v7** — client-side routing
- **Recharts v3** — composable chart library
- **ESLint** — linting

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Sidebar.tsx       # Navigation sidebar
│   └── Sidebar.css
├── pages/
│   ├── Analytics.tsx     # Dashboard with charts
│   ├── Reports.tsx       # Reports table
│   ├── DataSources.tsx   # Integration cards
│   └── Settings.tsx      # Preferences UI
├── shared.css            # Shared utility styles
├── App.tsx               # Router + layout shell
└── main.tsx              # Entry point
```

---

© Noble Savage — BBA v1.0.0
