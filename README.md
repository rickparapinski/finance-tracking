# My Finance Tracker

Personal finance tracker built with Next.js, PostgreSQL, and Docker. Tracks accounts, transactions, categories, and monthly forecasts.

## Stack

- **Frontend/Backend**: Next.js (App Router, Server Actions)
- **Database**: PostgreSQL 16 (via Docker)
- **Styling**: Tailwind CSS
- **Auth**: Password-gated via signed HMAC cookie (single user)

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker Desktop running

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` at the root:

```env
APP_PASSWORD=your-password
APP_SECRET=a-long-random-string

DATABASE_URL=postgresql://finance:your-db-password@YOUR_LXC_IP:5432/finance

TELEGRAM_BOT_TOKEN=your-token
TELEGRAM_CHAT_ID=your-chat-id
```

> The `DATABASE_URL` points to the LXC server DB (port 5432 is exposed). Make sure you're on the local network.

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Production Deployment

The app runs via Docker Compose on a Proxmox LXC container.

### Server environment

The LXC has `/opt/finance-tracker/.env` with:

```env
POSTGRES_PASSWORD=...
APP_PASSWORD=...
APP_SECRET=...
TELEGRAM_BOT_TOKEN=...
```

### Deploying a new version

SSH into the LXC, then:

```bash
ssh root@YOUR_LXC_IP
cd /opt/finance-tracker

# Pull latest changes
git pull

# Rebuild and restart the app container (keeps DB running)
docker compose build app
docker compose up -d app

# Check logs
docker compose logs -f app
```

> The DB container (`finance-tracker-db-1`) keeps running and is unaffected by app rebuilds.

### Full restart (app + DB)

```bash
docker compose down
docker compose up -d
```

### Check container status

```bash
docker compose ps
```

### View live logs

```bash
docker compose logs -f app      # app only
docker compose logs -f          # all services
```

---

## Database

### Connect to the DB directly

```bash
# From inside the LXC
docker compose exec db psql -U finance -d finance

# From local machine (DB port 5432 is exposed on the LXC)
psql postgresql://finance:your-db-password@YOUR_LXC_IP:5432/finance
```

### Backup

```bash
# On the LXC — dumps to a file
docker compose exec db pg_dump -U finance finance > backup_$(date +%Y%m%d).sql
```

### Restore

```bash
psql postgresql://finance:your-db-password@YOUR_LXC_IP:5432/finance < backup.sql
```

### Run a migration

```bash
# On the LXC
docker compose exec db psql -U finance -d finance -c "ALTER TABLE ..."
```

---

## Branch workflow

- `main` — stable production branch (deployed on the LXC)
- `feat/*` — feature branches, open PRs into `main`

After merging a PR into `main`, deploy with the steps above.
