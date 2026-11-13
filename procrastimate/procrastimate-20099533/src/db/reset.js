// Rebuilds the Procrastimate database and the generated documents it owns.
//
// Run this while the application is stopped. It touches only the named
// database file and the generated documents under the data folder.

import fs from 'node:fs';
import {
  describeDatabaseProblem,
  ensureDataDirectory,
  initialiseDatabase,
  openDatabaseFile,
  readSettlementRows
} from './connection.js';
import { clearGeneratedDocuments, writeGeneratedDocuments } from './documents.js';

export function resetDatabase({ dbPath, dataDir }) {
  ensureDataDirectory(dataDir);

  let db;
  if (fs.existsSync(dbPath)) {
    try {
      db = openDatabaseFile(dbPath);
      if (describeDatabaseProblem(db) !== null) {
        db.close();
        db = null;
      }
    } catch (error) {
      db = null;
    }
    if (db === null) {
      fs.rmSync(dbPath, { force: true });
    }
  }
  if (!db) {
    db = openDatabaseFile(dbPath);
  }

  try {
    const summary = initialiseDatabase(db);
    const settlements = readSettlementRows(db);
    clearGeneratedDocuments(dataDir);
    const documents = writeGeneratedDocuments(dataDir, settlements);
    return { ...summary, documents };
  } finally {
    db.close();
  }
}
