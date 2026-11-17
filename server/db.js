import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'photobooth.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
  }
});

// Helper functions for Promise-based queries
export function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export async function initDb() {
  await dbRun('PRAGMA foreign_keys = ON;');

  // Users
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Rooms
  await dbRun(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      room_code TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL,
      invite_token TEXT NOT NULL DEFAULT '',
      room_status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `);

  // Migrate rooms table if invite_token column is missing
  try {
    const columns = await dbAll('PRAGMA table_info(rooms)');
    const hasInviteToken = columns.some(c => c.name === 'invite_token');
    if (!hasInviteToken) {
      await dbRun("ALTER TABLE rooms ADD COLUMN invite_token TEXT NOT NULL DEFAULT ''");
      console.log('Migrated rooms table: added invite_token column');
    }
  } catch (migErr) {
    console.warn('Migration check warning for rooms table:', migErr.message);
  }

  // Room Participants
  await dbRun(`
    CREATE TABLE IF NOT EXISTS room_participants (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_ready INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER NOT NULL,
      connection_status TEXT NOT NULL DEFAULT 'connected',
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `);

  // Photos
  await dbRun(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      uploaded_by TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      photo_type TEXT NOT NULL,
      caption TEXT DEFAULT '',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `);

  // Photo Metadata
  await dbRun(`
    CREATE TABLE IF NOT EXISTS photo_metadata (
      id TEXT PRIMARY KEY,
      photo_id TEXT UNIQUE NOT NULL,
      layout TEXT,
      filter TEXT,
      dimensions TEXT,
      adjustments TEXT,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables initialized successfully');
}

export default db;
