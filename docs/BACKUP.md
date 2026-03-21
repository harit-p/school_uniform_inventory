# Database backups

Daily backups use **`MONGODB_URI`** from `server/.env` (same as the app).

## Run manually

From the project root:

```bash
npm run backup
```

Or from `server/`:

```bash
npm run backup
```

Backups are written under **`backups/`** at the project root (or set **`BACKUP_DIR`** to an absolute path).

- **Preferred:** If [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools) `mongodump` is on your `PATH`, each run creates a timestamped folder with **`dump.archive.gz`**. Restore with:

  ```bash
  mongorestore --uri="$MONGODB_URI" --gzip --archive=/path/to/dump.archive.gz
  ```

- **Fallback:** If `mongodump` is not installed, the script exports each collection as JSON (`*.json` + `manifest.json`).

## Retention

Default: delete backup folders older than **14 days** under `BACKUP_DIR`.

Override:

```bash
BACKUP_RETENTION_DAYS=30 npm run backup
```

## Schedule daily (cron)

Example: every day at 2:00 AM (adjust paths):

```cron
0 2 * * * cd /path/to/school_uniform && /usr/bin/env node server/scripts/dailyBackup.mjs >> /var/log/school_uniform_backup.log 2>&1
```

On macOS you can use `crontab -e` with the full path to `node` (`which node`).

## Windows Task Scheduler

Create a task that runs daily:

- **Program:** full path to `node.exe`
- **Arguments:** `server/scripts/dailyBackup.mjs`
- **Start in:** your project folder (e.g. `C:\path\to\school_uniform`)

## Cloud (MongoDB Atlas)

If you use Atlas, **M0** free tier does not include continuous cloud backup; consider upgrading for Atlas-native backups, or keep using this script with your Atlas connection string.

## Security

- `backups/` is listed in `.gitignore` — do not commit dumps.
- Protect `BACKUP_DIR` permissions on the server; archives contain full database data.
