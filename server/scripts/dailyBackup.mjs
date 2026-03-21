#!/usr/bin/env node
/**
 * Daily MongoDB backup for school_uniform (and any DB in MONGODB_URI).
 *
 * 1) Prefer `mongodump` (MongoDB Database Tools) — full BSON backup, best for restore.
 * 2) If mongodump is missing, writes JSON exports per collection (good for data recovery).
 *
 * Usage:
 *   node server/scripts/dailyBackup.mjs
 *   BACKUP_DIR=/var/backups/school_uniform RETENTION_DAYS=30 node server/scripts/dailyBackup.mjs
 *
 * Cron (2:00 AM daily):
 *   0 2 * * * cd /path/to/school_uniform && /usr/bin/node server/scripts/dailyBackup.mjs >> /var/log/school_uniform_backup.log 2>&1
 */

import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_uniform';
const RETENTION_DAYS = Math.max(1, parseInt(process.env.BACKUP_RETENTION_DAYS || '14', 10));
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const BACKUP_ROOT = process.env.BACKUP_DIR || path.join(PROJECT_ROOT, 'backups');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function findMongodump() {
  const isWin = process.platform === 'win32';
  const candidates = isWin ? ['mongodump.exe', 'mongodump'] : ['mongodump'];
  for (const bin of candidates) {
    const r = spawnSync(isWin ? 'where' : 'which', [bin], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout?.trim()) {
      return bin;
    }
  }
  return null;
}

function runMongodump(outDir) {
  const bin = findMongodump();
  if (!bin) return false;
  fs.mkdirSync(outDir, { recursive: true });
  try {
    execFileSync(bin, ['--uri', MONGODB_URI, '--gzip', `--archive=${path.join(outDir, 'dump.archive.gz')}`], {
      stdio: 'inherit',
      env: { ...process.env },
    });
    fs.writeFileSync(
      path.join(outDir, 'README.txt'),
      `Backup: mongodump gzip archive\nCreated: ${new Date().toISOString()}\nRestore: mongorestore --uri="<URI>" --gzip --archive=dump.archive.gz\n`,
      'utf8'
    );
    return true;
  } catch (e) {
    console.error('mongodump failed:', e.message);
    return false;
  }
}

async function runJsonExport(outDir) {
  const { MongoClient } = await import('mongodb');
  fs.mkdirSync(outDir, { recursive: true });
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  try {
    const db = client.db();
    const cols = await db.listCollections().toArray();
    const meta = { createdAt: new Date().toISOString(), database: db.databaseName, collections: [] };
    for (const { name } of cols) {
      if (name.startsWith('system.')) continue;
      const docs = await db.collection(name).find({}).toArray();
      const file = path.join(outDir, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(docs, null, 2), 'utf8');
      meta.collections.push({ name, count: docs.length, file: `${name}.json` });
    }
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(meta, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(outDir, 'README.txt'),
      `Backup: JSON export (mongodump not installed)\nUse mongoimport or a restore script to reload collections.\n`,
      'utf8'
    );
    console.log(`JSON backup: ${meta.collections.length} collection(s) → ${outDir}`);
  } finally {
    await client.close();
  }
}

function pruneOldBackups() {
  if (!fs.existsSync(BACKUP_ROOT)) return;
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const entries = fs.readdirSync(BACKUP_ROOT, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const full = path.join(BACKUP_ROOT, ent.name);
    const st = fs.statSync(full);
    if (st.mtimeMs < cutoff) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log('Removed old backup:', full);
    }
  }
}

async function main() {
  console.log('Backup started:', new Date().toISOString());
  console.log('Backup root:', BACKUP_ROOT);

  const folder = path.join(BACKUP_ROOT, timestamp());
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  const ok = runMongodump(folder);
  if (!ok) {
    console.log('mongodump not available or failed — using JSON export fallback');
    await runJsonExport(folder);
  } else {
    console.log('mongodump archive:', path.join(folder, 'dump.archive.gz'));
  }

  pruneOldBackups();
  console.log('Backup finished:', new Date().toISOString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
