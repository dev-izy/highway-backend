import Database from 'better-sqlite3';
import path from 'path';

// Store SQLite DB safely in current working directory
const dbPath = path.resolve('incidents.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    highway TEXT,
    severity TEXT,
    description TEXT,
    latitude REAL,
    longitude REAL,
    image TEXT,
    timestamp TEXT,
    status TEXT DEFAULT 'Pending'
  )
`);

export default db;