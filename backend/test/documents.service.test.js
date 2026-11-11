const { test } = require('node:test');
const assert = require('node:assert/strict');
const documentsService = require('../src/services/documents.service');

test('createDocument persists internal metadata and returns the public document', () => {
  const document = documentsService.createDocument(
    {
      originalName: 'report.pdf',
      size: 128,
      mimeType: 'application/pdf',
      storedName: 'stored-file',
    },
    'user-service-test'
  );

  assert.deepStrictEqual(document, {
    id: document.id,
    originalName: 'report.pdf',
    size: 128,
    uploadedAt: document.uploadedAt,
    owner: 'user-service-test',
    mimeType: 'application/pdf',
  });
  assert.strictEqual(typeof document.id, 'string');
  assert.strictEqual(documentsService.listDocumentsByOwner('user-service-test')[0].id, document.id);
});

test('createDocument uses a safe default MIME type when none is provided', () => {
  const document = documentsService.createDocument(
    {
      originalName: 'unknown.bin',
      size: 0,
      storedName: 'stored-unknown-file',
    },
    'user-service-test'
  );

  assert.strictEqual(document.mimeType, 'application/octet-stream');
});
