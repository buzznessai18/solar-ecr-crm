# Ecorays project tracker (frontend)

Frontend for the Ecorays Solar EPC Tracking BRD (v0.9). React + Vite, mock data only:
no backend, database or real sign-in. State lives in the browser (localStorage) and can
be reset from the account menu.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Demo accounts
Pick one on the sign-in screen, or switch later from the account menu (top right).
- Rhea Naik: admin, sees everything, approves requests, configures settings
- Aditya Kamat, Sneha Desai: sales owners, see only their records
- Pradeep, Kavita, Joel, Manoj: task assignees (survey, documentation, installation)

## Where things are
- `src/lib/config.js`: stages, substages, gate checklists, schemes, status lists
- `src/lib/mock.js`: seed data (dates are relative to today)
- `src/lib/store.js`: all workflow actions (zustand) and the audit trail
- `src/lib/utils.js`: permissions, gates, duplicate check, dates in IST
- `src/lib/kpi.js`: dashboard KPI definitions from BRD section 9
- `src/pages/`: screens; `src/components/`: shared UI, dialogs, stage string
