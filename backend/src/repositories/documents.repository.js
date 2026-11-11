const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');
const config = require('../config');

// Metadados mantidos em memória: somem ao reiniciar o processo (RNF-03).
const documentsById = new Map();

// Nome físico gerado pelo servidor, sem derivar do nome enviado pelo cliente.
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(config.storageDir, { recursive: true }).then(
      () => cb(null, config.storageDir),
      cb
    );
  },
  filename: (req, file, cb) => cb(null, randomUUID()),
});

function save(document) {
  documentsById.set(document.id, document);
  return document;
}

function findByIdAndOwner(id, owner) {
  const document = documentsById.get(id);
  return document && document.owner === owner ? document : null;
}

function findAllByOwner(owner) {
  return [...documentsById.values()].filter((document) => document.owner === owner);
}

function getFilePath(storedName) {
  return path.join(config.storageDir, storedName);
}

async function fileExists(storedName) {
  try {
    await fs.access(getFilePath(storedName));
    return true;
  } catch {
    return false;
  }
}

async function deleteFile(storedName) {
  await fs.rm(getFilePath(storedName), { force: true });
}

module.exports = {
  diskStorage,
  save,
  findByIdAndOwner,
  findAllByOwner,
  getFilePath,
  fileExists,
  deleteFile,
};
