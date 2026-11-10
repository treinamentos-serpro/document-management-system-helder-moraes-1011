# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web que permita a usuários identificados enviar, listar e baixar seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um arquivo por requisição.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, somente pelo usuário proprietário.
- Interface web React para envio, listagem e download.
- Armazenamento local de arquivos com Multer `diskStorage` e persistência de metadados em memória.
- Identificação simples do usuário por `X-User-Id`, sem autenticação nesta fase.

### Fora do escopo

- Armazenamento externo ou em nuvem.
- Banco de dados, persistência de metadados entre reinicializações ou recuperação automática de metadados.
- Autenticação, cadastro de usuários, autorização baseada em papéis ou compartilhamento de documentos.
- Versionamento, edição, exclusão ou busca avançada de documentos.
- Upload de múltiplos arquivos em uma única requisição.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento usando `multipart/form-data` e o campo `file`. | Com arquivo válido e `X-User-Id` presente, a API grava o arquivo localmente, registra seus metadados e responde `201 Created` com o documento criado. |
| RF-02 | O sistema valida o arquivo recebido. | A requisição sem arquivo responde `400`; arquivo acima do limite configurado responde `413`. O limite inicial é 10 MiB e pode ser alterado por configuração. |
| RF-03 | O sistema atribui identidade e nome de armazenamento seguros ao arquivo. | O identificador do usuário vem de `X-User-Id`. O nome físico é gerado pelo servidor e não é derivado diretamente do nome enviado pelo cliente. |
| RF-04 | O usuário pode listar seus documentos. | `GET /documents` retorna somente documentos cujo `owner` corresponde a `X-User-Id`; a resposta inclui uma lista vazia quando não houver documentos. |
| RF-05 | O usuário pode baixar um documento pelo identificador. | `GET /documents/:id/download` retorna o conteúdo binário como anexo somente quando o documento existe e pertence ao usuário informado. |
| RF-06 | O sistema comunica falhas em formato consistente. | Erros da API retornam JSON com código e mensagem; arquivo inexistente ou pertencente a outro usuário responde `404`. |
| RF-07 | A interface permite realizar os fluxos do MVP. | O usuário pode selecionar e enviar um arquivo, ver o resultado e a lista atualizada, e acionar o download; estados de carregamento, lista vazia e erro são apresentados. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são gravados exclusivamente no filesystem local da aplicação por Multer com `diskStorage`, no diretório `backend/storage` por padrão. |
| RNF-02 | O diretório de armazenamento e o limite máximo do arquivo são configuráveis por variáveis de ambiente. |
| RNF-03 | Os metadados ficam em memória durante a execução do processo; reiniciar o backend os remove e não deve ser apresentado como armazenamento durável. |
| RNF-04 | A API não aceita caminhos de arquivo fornecidos pelo cliente para localizar ou baixar documentos. O caminho de download é resolvido a partir dos metadados do documento. |
| RNF-05 | O nome original é preservado apenas como metadado e deve ser tratado com segurança ao compor o cabeçalho de download. |
| RNF-06 | Datas são representadas em UTC no formato ISO 8601. Tamanhos são inteiros em bytes. |
| RNF-07 | O backend segue a direção de dependências `routes -> controllers -> services -> repositories`, sem dependências das camadas internas em Express ou React. |
| RNF-08 | O frontend consome a API usando `fetch` pelo prefixo `/api`, encaminhado pelo proxy do Vite. |
| RNF-09 | A identidade via `X-User-Id` é somente um mecanismo de associação para o MVP e não comprova a identidade do solicitante. A solução não deve ser considerada segura para exposição pública sem autenticação e autorização apropriadas. |

### Configuração proposta

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório local onde os arquivos são gravados. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo de cada arquivo (10 MiB). |

## 5. Modelo de dados

Os metadados são mantidos em memória pelo repositório durante a vida do processo.

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string (UUID) | Público | Identificador único gerado pelo servidor. |
| `originalName` | string | Público | Nome original informado pelo cliente; não é usado como caminho no filesystem. |
| `size` | number (inteiro) | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string (ISO 8601 UTC) | Público | Instante em que o upload foi registrado. |
| `owner` | string | Público | Identificador recebido em `X-User-Id`. |
| `mimeType` | string | Público | Tipo informado/detectado para resposta de download; usar `application/octet-stream` quando indisponível. |
| `storedName` | string | Interno | Nome único gerado para persistência local; nunca deve ser aceito como entrada de rota. |

O objeto público de documento não inclui `storedName` nem o caminho absoluto no disco. `owner` é retornado nos metadados, mas cada consulta permanece filtrada pelo identificador de usuário da requisição.

## 6. Contratos de API

### Convenções

- Os caminhos abaixo são os caminhos do backend. No frontend, o proxy do Vite os expõe sob `/api` (por exemplo, `/api/documents`).
- `X-User-Id` é obrigatório em todos os endpoints deste MVP. Deve conter um identificador não vazio; sua ausência ou valor em branco resulta em `400 Bad Request`.
- Respostas de erro usam o formato `{ "error": { "code": "...", "message": "..." } }`.
- Os exemplos de metadados não incluem campos internos de armazenamento.

### `POST /upload`

- Entrada: `multipart/form-data`, um campo de arquivo chamado `file`, e cabeçalho `X-User-Id`.
- Sucesso: `201 Created`, `Content-Type: application/json`.

```json
{
  "document": {
    "id": "b3e4c40e-f17e-4e56-a29e-9f2d3e61bf44",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-11-10T12:00:00.000Z",
    "owner": "usuario-123",
    "mimeType": "application/pdf"
  }
}
```

- Erros: `400 MISSING_FILE` para arquivo ausente; `400 INVALID_USER` para identificador ausente/vazio; `413 FILE_TOO_LARGE` quando o arquivo ultrapassar `MAX_FILE_SIZE_BYTES`; `500 INTERNAL_ERROR` para falha inesperada de gravação ou registro.
- Se o arquivo for gravado, mas o registro dos metadados falhar, o sistema deve tentar remover o arquivo recém-gravado e retornar erro, evitando deixar arquivo órfão sempre que possível.

### `GET /documents`

- Entrada: cabeçalho `X-User-Id`.
- Sucesso: `200 OK`, lista apenas os documentos do usuário.

```json
{
  "documents": [
    {
      "id": "b3e4c40e-f17e-4e56-a29e-9f2d3e61bf44",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-11-10T12:00:00.000Z",
      "owner": "usuario-123",
      "mimeType": "application/pdf"
    }
  ]
}
```

- Sem documentos: `200 OK` com `{"documents": []}`.
- Erro: `400 INVALID_USER` quando o cabeçalho estiver ausente ou vazio; `500 INTERNAL_ERROR` para falha inesperada.

### `GET /documents/:id/download`

- Entrada: parâmetro `id` e cabeçalho `X-User-Id`.
- Sucesso: `200 OK` com o conteúdo binário; `Content-Type` usa o `mimeType` registrado ou `application/octet-stream`; resposta marcada como anexo com o nome original tratado para uso seguro no cabeçalho `Content-Disposition`.
- Erros: `400 INVALID_USER` para cabeçalho ausente/vazio; `404 DOCUMENT_NOT_FOUND` se o documento não existir, não pertencer ao usuário ou se o arquivo local não estiver disponível; `500 INTERNAL_ERROR` para outra falha de leitura.
- O endpoint nunca aceita ou resolve caminhos de filesystem vindos do parâmetro ou de outro dado controlado pelo cliente.

## 7. Decisões arquiteturais

- **Routes:** declaram os caminhos e encaminham as requisições aos controllers.
- **Controllers:** validam dados HTTP básicos, extraem arquivo/cabeçalhos/parâmetros e mapeiam resultados e erros para status e respostas HTTP.
- **Services:** aplicam as regras do caso de uso: validação, associação ao usuário e coordenação de metadados e arquivo.
- **Repositories:** encapsulam o acesso ao filesystem local e à coleção de metadados em memória. Não dependem das camadas HTTP.
- **Upload:** usar Multer com `diskStorage`, diretório configurável e nome físico único gerado pelo servidor. Limite de tamanho configurável; não há armazenamento externo.
- **Metadados:** coleção em memória, com identificador UUID, nome original, tamanho, data, proprietário e tipo de mídia. Reiniciar o processo limpa essa coleção.
- **Identidade:** `X-User-Id` é um identificador de contexto para o MVP, não autenticação. Consultas e downloads são sempre filtrados pelo proprietário.
- **Frontend:** componentes React funcionais e serviço baseado em `fetch`, usando o proxy `/api` do Vite. A interface cobre envio, listagem, download e estados de erro/carregamento/vazio.
- **Erros:** controllers traduzem erros conhecidos dos serviços para o contrato JSON; detalhes internos e caminhos locais não são enviados ao cliente.

## 8. Plano de execução

As etapas abaixo descrevem a implementação futura do produto em nível de capacidade, sem prescrever alterações de arquivos específicos.

1. **Estabelecer contratos e configuração:** confirmar as variáveis de ambiente, limites, formato dos metadados, identificação por usuário e convenções de erro.
2. **Implementar o fluxo de upload no backend:** configurar Multer `diskStorage`, validar a requisição, gerar metadados e coordenar persistência local pelas camadas definidas.
3. **Implementar listagem e download no backend:** filtrar por proprietário, resolver arquivos a partir dos metadados e padronizar respostas e erros.
4. **Construir os fluxos da interface:** integrar upload, atualização da lista e download por `fetch` via `/api`, incluindo estados de carregamento, vazio e falha.
5. **Verificar o comportamento integrado:** cobrir sucesso, validações, isolamento entre usuários, arquivo ausente, limite excedido, reinicialização (perda dos metadados) e configuração; executar testes do backend e build do frontend.

## 9. Critérios de conclusão

- Os três endpoints atendem aos contratos desta especificação e não expõem arquivos de outros usuários.
- Uploads válidos são persistidos somente no armazenamento local configurado; metadados são mantidos somente em memória.
- Validações e erros relevantes têm status e formato documentados.
- A interface permite concluir upload, listagem e download usando a API pelo proxy configurado.
- Testes automatizados verificam os casos de sucesso e falha essenciais; o backend inicia e o frontend compila.
- A implementação respeita a separação de camadas e não introduz armazenamento externo, banco de dados ou autenticação fora do escopo.