import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { hashPassword } from '../auth/passwords.js';
import { seedReservations, seedSettlements, seedStock, seedUsers } from './seed-data.js';
import { writeGeneratedDocuments } from './documents.js';

const SCHEMA_FILE = new URL('./schema.sql', import.meta.url);

const REMOVE_SQL = [
  'DROP TABLE IF EXISTS settlements',
  'DROP TABLE IF EXISTS reservations',
  'DROP TABLE IF EXISTS stock',
  'DROP TABLE IF EXISTS users'
].join('; ') + ';';

const REQUIRED_TABLES = ['users', 'stock', 'reservations', 'settlements'];

const DATA_FOLDERS = ['manifests', 'guides', 'settlements'];

export function ensureDataDirectory(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  for (const folder of DATA_FOLDERS) {
    fs.mkdirSync(path.join(dataDir, folder), { recursive: true });
  }
}

export function openDatabaseFile(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

// Recreates the schema and every seeded record in one transaction.
export function initialiseDatabase(db) {
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
  const apply = db.transaction(() => {
    db.exec(REMOVE_SQL);
    db.exec(schema);

    const insertUser = db.prepare(
      'INSERT INTO users (id, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    );
    for (const user of seedUsers) {
      insertUser.run(user.id, user.username, user.displayName, hashPassword(user.password), user.role);
    }

    const insertStock = db.prepare(
      'INSERT INTO stock (sku, title, available, daily_cents) VALUES (?, ?, ?, ?)'
    );
    for (const item of seedStock) {
      insertStock.run(item.sku, item.title, item.available, item.dailyCents);
    }

    const insertReservation = db.prepare(
      "INSERT INTO reservations (id, owner_id, sku, start_date, end_date, status, delivery_note) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    for (const booking of seedReservations) {
      insertReservation.run(booking.id, booking.ownerId, booking.sku, booking.startDate,
        booking.endDate, booking.status, booking.deliveryNote);
    }

    const insertSettlement = db.prepare(
      'INSERT INTO settlements (id, title, access_code, payload, created_by) VALUES (?, ?, ?, ?, ?)'
    );
    for (const settlement of seedSettlements) {
      insertSettlement.run(settlement.id, settlement.title, settlement.accessCode,
        settlement.payload, settlement.createdBy);
    }
  });

  apply();

  return {
    users: seedUsers.length,
    stock: seedStock.length,
    reservations: seedReservations.length,
    settlements: seedSettlements.length
  };
}

export function readSettlementRows(db) {
  return db.prepare('SELECT id, payload FROM settlements ORDER BY id').all();
}

// Returns a short description of the first problem found, or null when the
// database can be used.
export function describeDatabaseProblem(db) {
  let integrity;
  try {
    integrity = db.pragma('integrity_check', { simple: true });
  } catch (error) {
    return 'The database file could not be read';
  }
  if (integrity !== 'ok') return 'The database file is damaged';

  const tables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name)
  );
  const missing = REQUIRED_TABLES.filter((name) => !tables.has(name));
  if (missing.length > 0) return 'The database file has no Procrastimate tables';
  return null;
}

export function rebuildMessage(dbPath, problem) {
  return problem + ' at ' + dbPath + '. Run "npm run reset" to rebuild it.';
}

// Opens the database, creating and seeding it the first time the application
// starts. An existing database is never overwritten here.
export function openDatabase({ dbPath, dataDir }) {
  ensureDataDirectory(dataDir);
  const existed = fs.existsSync(dbPath);

  let db;
  try {
    db = openDatabaseFile(dbPath);
  } catch (error) {
    throw new Error(rebuildMessage(dbPath, 'The database file could not be opened'));
  }

  if (!existed) {
    initialiseDatabase(db);
    writeGeneratedDocuments(dataDir, readSettlementRows(db));
    return db;
  }

  const problem = describeDatabaseProblem(db);
  if (problem !== null) {
    db.close();
    throw new Error(rebuildMessage(dbPath, problem));
  }
  return db;
}
