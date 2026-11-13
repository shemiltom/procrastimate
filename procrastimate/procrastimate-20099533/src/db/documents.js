// Writing and clearing the generated documents that live under the data folder.
//
// Only the named files below are ever written or removed. Anything else in the
// data folder belongs to the person using the application and is left alone.

import fs from 'node:fs';
import path from 'node:path';
import { guideFiles, manifestSheets } from './seed-data.js';

const SETTLEMENT_FILE_PATTERN = /^settlement-\d+\.csv$/;

export function settlementFileName(id) {
  return 'settlement-' + id + '.csv';
}

export function writeDocument(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + '.writing';
  fs.writeFileSync(temporaryPath, contents);
  fs.renameSync(temporaryPath, filePath);
  return filePath;
}

export function writeSettlementCopy(dataDir, id, payload) {
  return writeDocument(path.join(dataDir, 'settlements', settlementFileName(id)), payload);
}

export function listSettlementCopies(dataDir) {
  const folder = path.join(dataDir, 'settlements');
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder).filter((name) => SETTLEMENT_FILE_PATTERN.test(name));
}

function removeIfPresent(filePath) {
  if (fs.existsSync(filePath)) fs.rmSync(filePath);
}

// The explicit generated file list. No folder is emptied recursively.
export function clearGeneratedDocuments(dataDir) {
  for (const sheet of manifestSheets) {
    removeIfPresent(path.join(dataDir, 'manifests', sheet.name));
  }
  for (const guide of guideFiles) {
    removeIfPresent(path.join(dataDir, 'guides', guide.name));
  }
  for (const name of listSettlementCopies(dataDir)) {
    removeIfPresent(path.join(dataDir, 'settlements', name));
  }
}

export function writeGeneratedDocuments(dataDir, settlements) {
  for (const sheet of manifestSheets) {
    writeDocument(path.join(dataDir, 'manifests', sheet.name), sheet.contents);
  }
  for (const guide of guideFiles) {
    writeDocument(path.join(dataDir, 'guides', guide.name), guide.contents);
  }
  for (const row of settlements) {
    writeSettlementCopy(dataDir, row.id, row.payload);
  }
  return manifestSheets.length + guideFiles.length + settlements.length;
}
