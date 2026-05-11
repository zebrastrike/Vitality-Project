# Backups, Disaster Recovery, and Restore

This document covers what's backed up automatically, what isn't, recovery
objectives, and the procedure to restore the Vitality Project from cold storage.

Last verified: 2026-05-11.

---

## Inventory of data + where it lives

| Data | System | Backup mechanism | Retention |
|---|---|---|---|
| Postgres database | **Neon** (`ep-square-snow-anwn2dwu-pooler.c-6.us-east-1.aws.neon.tech`) | Neon point-in-time recovery (branching) | **7 days** rolling on the free/launch plan; longer on Scale |
| Application code | **GitHub** (`zebrastrike/Vitality-Project`) | git push + tags | Indefinite |
| Container image | Rebuilt from source on each `master` push | n/a (re-buildable) | n/a |
| `.env.production` (secrets) | **Hetzner box only** at `/opt/vitality/.env.production` + dated `.env.production.bak.before-*` copies | Manual local copies on every edit | Indefinite on disk |
| GitHub Actions secrets | GitHub repo settings | Set manually, no auto backup | n/a |
| Resend templates / domain config | **Resend** dashboard | Provider | Provider |
| Cloudflare DNS | **Cloudflare** dashboard | Provider | Provider |

**Critical:** `.env.production` is **not** in version control and is **not** copied off-box automatically. If the Hetzner CPX42 is destroyed, the env file is gone with it. The dated `.env.production.bak.before-*` files only protect against bad edits, not host loss. Mitigation in progress: see "Off-box env backup" below.

---

## Recovery objectives

| Scenario | RTO (target) | RPO (target) |
|---|---|---|
| App crash, container won't start | **15 min** | 0 (no data loss) |
| Bad code deploy | **5 min** (`git revert` + push) | 0 |
| Bad DB migration | **30 min** (Neon branch from earlier point) | ≤ 5 min |
| Accidental data delete | **30 min** | ≤ 5 min (PITR window) |
| Hetzner host failure | **2 hr** (fresh box + restore from env backup + redeploy) | 0 (app is stateless; DB is on Neon) |
| Neon account loss | **24+ hr** (catastrophic — no off-Neon snapshot today) | up to 7 days |

---

## Procedures

### 1. Rollback a bad deploy

```bash
# locally
git log --oneline -10            # find the last good commit
git revert <bad-sha>
git push origin master           # GH Actions auto-deploys
```

If you can't wait for CI:

```bash
ssh root@178.104.155.129
cd /opt/vitality
git fetch --all
git reset --hard <good-sha>
docker compose up -d --build app
```

### 2. Restore Postgres from a Neon snapshot

1. Open the Neon console → project → "Branches".
2. Click "Create branch from point-in-time" — pick the timestamp just before the damage.
3. Copy the new branch's connection string.
4. Either:
   - **Promote** the new branch (point the app at it) — fastest, but losses everything since the point chosen, or
   - **Selective copy**: use `pg_dump --table=...` from the branch then `psql` into the live DB.

Promote:

```bash
# On Hetzner — swap DATABASE_URL to the new branch's URL
ssh root@178.104.155.129
cd /opt/vitality
ts=$(date +%Y%m%d-%H%M%S)
cp .env.production .env.production.bak.before-pitr-${ts}
$EDITOR .env.production
# replace DATABASE_URL=... with the new branch URL (KEEP &pgbouncer=true&connection_limit=10)
docker compose up -d app
```

### 3. Restore an off-box env file

If `.env.production` is lost (host wipe) and you don't have a fresh copy:

1. Re-mint each secret from the source service:
   - `DATABASE_URL` from Neon console
   - `RESEND_API_KEY` from Resend dashboard
   - `NEXTAUTH_SECRET` — generate fresh with `openssl rand -base64 32` (this **logs out every active session**, fine in a DR)
   - `CRON_SECRET` — fresh `openssl rand -hex 32`
   - Stripe / Twilio / Turnstile — re-copy from their dashboards if configured
2. Rebuild env from `.env.example` template:
   ```bash
   cp /opt/vitality/.env.example /opt/vitality/.env.production
   $EDITOR /opt/vitality/.env.production
   ```
3. Restart:
   ```bash
   cd /opt/vitality && docker compose up -d app
   ```

### 4. Provision a fresh host from scratch

If the Hetzner box is unrecoverable:

```bash
# 1. New box (Hetzner CPX42 or larger), Ubuntu 24.04
# 2. Install Docker + docker-compose plugin
# 3. Add the deploy SSH key (DEPLOY_SSH_KEY in GitHub secrets)
# 4. Clone:
git clone https://github.com/zebrastrike/Vitality-Project.git /opt/vitality
cd /opt/vitality
# 5. Restore .env.production (per section 3)
# 6. First boot
docker compose up -d --build
# 7. Update HETZNER_HOST GitHub secret to the new IP so future deploys land
# 8. Update Cloudflare A record so vitalityproject.global points at the new IP
# 9. Re-install crontab from this repo's docs/crontab snapshot below
```

---

## Off-box env backup (recommended, not yet implemented)

Mitigate the single-point-of-failure on `.env.production` by copying it nightly to a private S3 bucket (or to your local Mac, or to a private GitHub gist). Suggested cron line for Hetzner:

```
30 3 * * * gpg --batch --yes --passphrase-file ~/.env-backup-pass -c /opt/vitality/.env.production -o ~/env-backups/.env.$(date +\%F).gpg && rclone copy ~/env-backups/ remote:vitality-env/
```

(Replace `remote:` with your configured rclone target — Cloudflare R2, Backblaze B2, or S3.)

---

## Restored crontab snapshot

For DR, here's the expected `crontab -l` output on Hetzner (CRON_SECRET redacted):

```
*/30 * * * * curl -fsS -m 30 "http://localhost:3000/api/cron/abandoned-carts?secret=<CRON_SECRET>" >> /var/log/vitality-cron.log 2>&1
17 * * * * curl -fsS -m 60 "http://localhost:3000/api/cron/stale-zelle-orders?secret=<CRON_SECRET>" >> /var/log/vitality-cron.log 2>&1
23 */6 * * * curl -fsS -m 60 "http://localhost:3000/api/cron/payment-reminders?secret=<CRON_SECRET>" >> /var/log/vitality-cron.log 2>&1
0 14 * * * curl -fsS -m 60 "http://localhost:3000/api/cron/membership-reminders?secret=<CRON_SECRET>" >> /var/log/vitality-cron.log 2>&1
30 13 * * * curl -fsS -m 120 "http://localhost:3000/api/cron/membership-monthly?secret=<CRON_SECRET>" >> /var/log/vitality-cron.log 2>&1
```

---

## Verification checklist after a restore

Run through this in order after any restore action:

- [ ] `curl https://vitalityproject.global/api/health` → `status: "ok"` with all components OK
- [ ] Sign in as admin at `/auth/login`
- [ ] Open `/admin/orders` — count of recent orders matches the DB you expected
- [ ] Open `/admin/cron-status` — most jobs say Healthy (or "no data" if `CronRun` table empty post-PITR — they'll repopulate at next tick)
- [ ] Place a test order at `/products/retatrutide` (5mg, $42) — confirm Zelle email lands
- [ ] Mark the test order paid — confirm the "ready to ship" admin email lands at `ADMIN_EMAIL`
- [ ] Click `/r/MICHEV759` (or any active affiliate code) and confirm the redirect sets `aff_code` cookie
