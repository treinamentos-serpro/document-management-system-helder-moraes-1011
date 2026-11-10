const { Router } = require('express');
const documentsController = require('../controllers/documents.controller');

const router = Router();

router.post('/upload', documentsController.receiveFile, documentsController.uploadDocument);
router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);

module.exports = router;
