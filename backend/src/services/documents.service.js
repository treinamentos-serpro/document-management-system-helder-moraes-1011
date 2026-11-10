const { randomUUID } = require('node:crypto');
const documentsRepository = require('../repositories/documents.repository');
const { AppError } = require('../errors');

const DEFAULT_MIME_TYPE = 'application/octet-stream';

// Remove campos internos (ex.: storedName) do objeto exposto à API.
function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
    mimeType: document.mimeType,
  };
}

async function createDocument(file, owner) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    mimeType: file.mimetype || DEFAULT_MIME_TYPE,
    storedName: file.filename,
  };

  try {
    documentsRepository.save(document);
  } catch (error) {
    // Evita arquivo órfão quando o registro dos metadados falha.
    await documentsRepository.deleteFile(file.filename).catch(() => {});
    throw error;
  }

  return toPublicDocument(document);
}

function listDocumentsByOwner(owner) {
  return documentsRepository.findAllByOwner(owner).map(toPublicDocument);
}

async function getDocumentForDownload(id, owner) {
  const document = documentsRepository.findByIdAndOwner(id, owner);
  if (!document || !(await documentsRepository.fileExists(document.storedName))) {
    throw new AppError('DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    filePath: documentsRepository.getFilePath(document.storedName),
    originalName: document.originalName,
    mimeType: document.mimeType,
  };
}

module.exports = {
  createDocument,
  listDocumentsByOwner,
  getDocumentForDownload,
};
