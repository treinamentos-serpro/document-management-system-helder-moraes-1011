// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const config = require('./config');
const documentsRouter = require('./routes/documents.routes');

const app = express();

app.use(express.json());

// Endpoint de verificação de saúde.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(documentsRouter);

// Erros não tratados pelos controllers: mantém o formato JSON padrão da API.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || error.statusCode || 500;
  if (status >= 500) {
    console.error(error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' },
    });
  }

  return res.status(status).json({
    error: { code: 'BAD_REQUEST', message: 'Requisição inválida.' },
  });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`DMS backend ouvindo na porta ${config.port}`);
  });
}

module.exports = app;
