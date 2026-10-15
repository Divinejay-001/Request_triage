# Request Triage System

A small internal tool: an operations team imports a CSV of customer requests, reviews them, and tracks each request's **status** and **owner**. Data is stored in MongoDB so changes survive restarts.

Stack: React (Vite) · Express · Mongoose · MongoDB (Atlas or local).

## Prerequisites

- Node.js 18+ (developed on Node 22)
- A MongoDB connection string (MongoDB Atlas free tier works; allow your IP in Atlas Network Access)

## Setup

```bash
# 1. Server
cd server
npm install
cp .env.example .env        # then edit MONGODB_URI
npm start                   # API on http://localhost:4000

# 2. Client (second terminal)
cd client
npm install
npm run dev                 # UI on http://localhost:5173 (proxies /api to :4000)
```

### Environment variables (`server/.env`)

| Name          | Purpose                          | Default |
| ------------- | -------------------------------- | ------- |
| `MONGODB_URI` | MongoDB connection string        | —       |
| `PORT`        | API port                         | `4000`  |

## Using the app

1. Click **Import CSV** and choose `fixtures/requests.csv`.
2. Read the **import report**: imported count, rejected count, and a reason for each rejected row (row 1 = header, first data record = row 2).
3. Search (ID, requester, subject, description) and/or filter by status.
4. Click a row to open details, change **status** and **owner**, then **Save changes**.
5. Restart the server and reload — data and edits persist.

## API

| Method | Path                        | Purpose                                              |
| ------ | --------------------------- | ---------------------------------------------------- |
| POST   | `/api/requests/import`      | multipart `file` field; returns the import report    |
| GET    | `/api/requests?q=&status=`  | list, optional search + status filter                |
| GET    | `/api/requests/:id`         | single request                                       |
| PATCH  | `/api/requests/:id`         | body `{ status?, owner? }`                           |
| GET    | `/api/requests/meta`        | allowed statuses and owners                          |
| GET    | `/api/health`               | health check                                         |

## Tests

```bash
cd server
npm test
```

Seven automated checks cover the import rules with no database needed. One runs the real `fixtures/requests.csv` (expects 10 valid, 4 rejected at rows 11, 12, 13, 15). The rest cover missing required fields, invalid and impossible dates, in-file duplicates, empty description, priority handling and missing columns, using `server/test/sample-messy.csv`, a small file of my own. The original fixture is never modified.

### Manual checks (reproducible)

- **Re-import:** import the same file twice. Second report shows every row rejected as "already exists"; no records change.
- **Persistence:** assign an owner, stop and restart the server, reload the page — owner is still set.
- **Failure case:** import `fixtures/requests.csv` into an empty database; rows 11, 12, 13 and 15 are rejected with reasons and 10 rows are imported.

## Project layout

```
fixtures/requests.csv      original input, unmodified
server/src                 app, routes, model, import + validation services
server/test                automated checks + messy sample CSV
client/src                 React UI
DECISIONS.md  AI_WORKFLOW.md
```
