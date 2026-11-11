const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

// Configuração precisa existir antes de carregar o app, pois config.js lê o ambiente na importação.
const storageDir = path.join(os.tmpdir(), `dms-test-${process.pid}-${Date.now()}`);
process.env.STORAGE_DIR = storageDir;
process.env.MAX_FILE_SIZE_BYTES = '1024';

const app = require('../src/app');

const OWNER = 'usuario-a';
const OTHER_OWNER = 'usuario-b';

let server;
let baseUrl;

before(async () => {
  await fs.mkdir(storageDir, { recursive: true });
  server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  server.closeAllConnections();
  await fs.rm(storageDir, { recursive: true, force: true });
});

// null representa a ausência do cabeçalho X-User-Id.
function buildHeaders(user) {
  return user === null ? {} : { 'X-User-Id': user };
}

async function uploadFile({
  user = OWNER,
  content = 'conteúdo de teste',
  name = 'relatorio.txt',
  type = 'text/plain',
} = {}) {
  const form = new FormData();
  form.append('file', new Blob([content], { type }), name);
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: buildHeaders(user),
    body: form,
  });
}

async function uploadDocument(options) {
  const response = await uploadFile(options);
  assert.strictEqual(response.status, 201, 'o upload de teste deve ser aceito');
  const { document } = await response.json();
  return document;
}

async function listDocuments(user = OWNER) {
  return fetch(`${baseUrl}/documents`, { headers: buildHeaders(user) });
}

describe('POST /upload', () => {
  test('retorna 201 e os metadados do documento enviado', async () => {
    const response = await uploadFile({ content: 'abc', name: 'contrato.txt' });
    const body = await response.json();

    assert.strictEqual(response.status, 201);
    assert.strictEqual(body.document.originalName, 'contrato.txt');
    assert.strictEqual(body.document.size, 3);
    assert.strictEqual(body.document.owner, OWNER);
    assert.strictEqual(body.document.mimeType, 'text/plain');
    assert.ok(body.document.id);
    assert.ok(body.document.uploadedAt);
  });

  test('não expõe o nome físico armazenado no disco', async () => {
    const document = await uploadDocument({ name: 'privado.txt' });

    assert.strictEqual(document.storedName, undefined);
  });

  test('grava o arquivo no diretório de armazenamento', async () => {
    const filesBefore = await fs.readdir(storageDir);

    await uploadDocument({ content: 'gravado em disco' });

    const filesAfter = await fs.readdir(storageDir);
    assert.strictEqual(filesAfter.length, filesBefore.length + 1);
  });

  test('retorna 400 quando o cabeçalho X-User-Id não é enviado', async () => {
    const response = await uploadFile({ user: null });
    const body = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(body.error.code, 'INVALID_USER');
  });

  test('retorna 400 quando o cabeçalho X-User-Id está vazio', async () => {
    const response = await uploadFile({ user: '   ' });
    const body = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(body.error.code, 'INVALID_USER');
  });

  test('retorna 400 quando o arquivo não é enviado no campo "file"', async () => {
    const form = new FormData();
    form.append('outro', 'valor');

    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: buildHeaders(OWNER),
      body: form,
    });
    const body = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(body.error.code, 'MISSING_FILE');
  });

  test('retorna 413 quando o arquivo excede o tamanho máximo', async () => {
    const response = await uploadFile({ content: 'x'.repeat(2048) });
    const body = await response.json();

    assert.strictEqual(response.status, 413);
    assert.strictEqual(body.error.code, 'FILE_TOO_LARGE');
  });
});

describe('GET /documents', () => {
  test('retorna 400 quando o cabeçalho X-User-Id não é enviado', async () => {
    const response = await listDocuments(null);
    const body = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(body.error.code, 'INVALID_USER');
  });

  test('retorna lista vazia para um usuário sem documentos', async () => {
    const response = await listDocuments('usuario-sem-documentos');
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(body.documents, []);
  });

  test('retorna apenas os documentos do usuário solicitante', async () => {
    const owned = await uploadDocument({ user: OTHER_OWNER, name: 'do-outro.txt' });

    const response = await listDocuments(OTHER_OWNER);
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    const ids = body.documents.map((document) => document.id);
    assert.ok(ids.includes(owned.id));
    assert.ok(body.documents.every((document) => document.owner === OTHER_OWNER));
  });

  test('não expõe campos internos dos documentos', async () => {
    await uploadDocument({ user: 'usuario-campos', name: 'campos.txt' });

    const response = await listDocuments('usuario-campos');
    const body = await response.json();

    assert.strictEqual(body.documents.length, 1);
    assert.strictEqual(body.documents[0].storedName, undefined);
    assert.strictEqual(body.documents[0].originalName, 'campos.txt');
  });
});

describe('GET /documents/:id/download', () => {
  test('retorna o conteúdo original com cabeçalho de anexo', async () => {
    const document = await uploadDocument({
      content: 'conteúdo para download',
      name: 'baixar.txt',
      type: 'text/plain',
    });

    const response = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: buildHeaders(OWNER),
    });

    assert.strictEqual(response.status, 200);
    assert.strictEqual(await response.text(), 'conteúdo para download');
    assert.match(response.headers.get('content-type'), /^text\/plain/);
    assert.match(response.headers.get('content-disposition'), /attachment/);
    assert.match(response.headers.get('content-disposition'), /baixar\.txt/);
  });

  test('retorna 400 quando o cabeçalho X-User-Id não é enviado', async () => {
    const document = await uploadDocument({ name: 'sem-cabecalho.txt' });

    const response = await fetch(`${baseUrl}/documents/${document.id}/download`);
    const body = await response.json();

    assert.strictEqual(response.status, 400);
    assert.strictEqual(body.error.code, 'INVALID_USER');
  });

  test('retorna 404 para um id inexistente', async () => {
    const response = await fetch(
      `${baseUrl}/documents/00000000-0000-0000-0000-000000000000/download`,
      { headers: buildHeaders(OWNER) }
    );
    const body = await response.json();

    assert.strictEqual(response.status, 404);
    assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
  });

  test('retorna 404 quando o documento pertence a outro usuário', async () => {
    const document = await uploadDocument({ user: OWNER, name: 'privado-download.txt' });

    const response = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: buildHeaders(OTHER_OWNER),
    });
    const body = await response.json();

    assert.strictEqual(response.status, 404);
    assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
  });

  test('retorna 404 quando o arquivo foi removido do disco', async () => {
    const filesBefore = await fs.readdir(storageDir);
    const document = await uploadDocument({ name: 'removido.txt' });
    const [storedName] = (await fs.readdir(storageDir)).filter(
      (file) => !filesBefore.includes(file)
    );
    await fs.rm(path.join(storageDir, storedName));

    const response = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: buildHeaders(OWNER),
    });
    const body = await response.json();

    assert.strictEqual(response.status, 404);
    assert.strictEqual(body.error.code, 'DOCUMENT_NOT_FOUND');
  });
});
