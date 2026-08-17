import Database from 'better-sqlite3';

const db: Database.Database = new Database('highway_alerts.db');
// Create Incidents Table
db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    highway TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    image TEXT,
    timestamp TEXT NOT NULL,
    status TEXT DEFAULT 'Pending'
  )
`);

export default db;