const multer = require('multer');
const config = require('../config');
const documentsRepository = require('../repositories/documents.repository');
const documentsService = require('../services/documents.service');
const { AppError } = require('../errors');

const upload = multer({
  storage: documentsRepository.diskStorage,
  limits: { fileSize: config.maxFileSizeBytes },
});
const receiveSingleFile = upload.single('file');

const ERROR_STATUS_BY_CODE = {
  INVALID_USER: 400,
  MISSING_FILE: 400,
  INVALID_UPLOAD: 400,
  FILE_TOO_LARGE: 413,
  DOCUMENT_NOT_FOUND: 404,
};

function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

function sendInvalidUser(res) {
  sendError(res, 400, 'INVALID_USER', 'O cabeçalho X-User-Id é obrigatório.');
}

function getOwner(req) {
  const owner = req.get('X-User-Id');
  return owner && owner.trim() ? owner.trim() : null;
}

function handleServiceError(error, res, next) {
  const status = error instanceof AppError && ERROR_STATUS_BY_CODE[error.code];
  if (status) {
    return sendError(res, status, error.code, error.message);
  }
  return next(error);
}

// Valida o usuário antes de gravar o arquivo em disco, evitando arquivos sem dono.
function receiveFile(req, res, next) {
  if (!getOwner(req)) {
    return sendInvalidUser(res);
  }

  return receiveSingleFile(req, res, (error) => {
    if (!error) {
      return next();
    }
    if (error.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 413, 'FILE_TOO_LARGE', 'O arquivo excede o tamanho máximo permitido.');
    }
    if (error instanceof multer.MulterError) {
      return sendError(res, 400, 'INVALID_UPLOAD', 'Não foi possível processar o envio do arquivo.');
    }
    return next(error);
  });
}

async function uploadDocument(req, res, next) {
  if (!req.file) {
    return sendError(res, 400, 'MISSING_FILE', 'Envie o arquivo no campo "file".');
  }

  try {
    const document = await documentsService.createDocument(req.file, getOwner(req));
    return res.status(201).json({ document });
  } catch (error) {
    return handleServiceError(error, res, next);
  }
}

function listDocuments(req, res) {
  const owner = getOwner(req);
  if (!owner) {
    return sendInvalidUser(res);
  }

  return res.json({ documents: documentsService.listDocumentsByOwner(owner) });
}

async function downloadDocument(req, res, next) {
  const owner = getOwner(req);
  if (!owner) {
    return sendInvalidUser(res);
  }

  try {
    const { filePath, originalName, mimeType } = await documentsService.getDocumentForDownload(
      req.params.id,
      owner
    );
    res.attachment(originalName);
    res.type(mimeType);
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    return handleServiceError(error, res, next);
  }
}

module.exports = {
  receiveFile,
  uploadDocument,
  listDocuments,
  downloadDocument,
};
