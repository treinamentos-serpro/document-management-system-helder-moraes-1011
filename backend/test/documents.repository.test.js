const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const config = require('../src/config');
const documentsRepository = require('../src/repositories/documents.repository');

test('getFilePath keeps stored files inside the storage directory', () => {
  assert.strictEqual(
    documentsRepository.getFilePath('stored-file'),
    path.join(config.storageDir, 'stored-file')
  );
});

test('getFilePath rejects paths outside the storage directory', () => {
  assert.throws(() => documentsRepository.getFilePath('../outside-file'), /Invalid stored file name/);
  assert.throws(() => documentsRepository.getFilePath(path.resolve('/outside-file')), /Invalid stored file name/);
});
