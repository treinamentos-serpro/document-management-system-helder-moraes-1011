// Cliente da API do backend. Todas as chamadas passam pelo prefixo /api,
// encaminhado pelo proxy do Vite para o backend.

const API_PREFIX = '/api';
const NETWORK_ERROR_MESSAGE = 'Não foi possível conectar ao servidor.';
const UNEXPECTED_ERROR_MESSAGE = 'Erro inesperado ao comunicar com o servidor.';

export class ApiError extends Error {
  constructor(message, { code, status } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function buildApiError(response) {
  const body = await response.json().catch(() => null);
  const { code, message } = body?.error ?? {};
  return new ApiError(message ?? UNEXPECTED_ERROR_MESSAGE, { code, status: response.status });
}

// Centraliza headers, erros HTTP e falhas de rede. Cada chamada informa o usuário em X-User-Id.
async function request(path, { userId, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_PREFIX}${path}`, {
      ...options,
      headers: { 'X-User-Id': userId, ...options.headers },
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(NETWORK_ERROR_MESSAGE, { code: 'NETWORK_ERROR' });
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }
  return response;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', { userId, method: 'POST', body: formData });
  const { document } = await response.json();
  return document;
}

export async function listDocuments(userId, { signal } = {}) {
  const response = await request('/documents', { userId, signal });
  const { documents } = await response.json();
  return documents;
}

// Retorna um Blob (e não um link direto) porque o download exige o cabeçalho X-User-Id.
export async function downloadDocument(userId, documentId) {
  const response = await request(`/documents/${encodeURIComponent(documentId)}/download`, {
    userId,
  });
  return response.blob();
}
