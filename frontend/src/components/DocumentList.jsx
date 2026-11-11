import DownloadButton from './DownloadButton.jsx';

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('pt-BR');
}

export default function DocumentList({ userId, documents, isLoading, error }) {
  if (isLoading) {
    return <p role="status">Carregando documentos...</p>;
  }
  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (documents.length === 0) {
    return <p>Nenhum documento enviado por este usuário.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Tamanho</th>
          <th>Enviado em</th>
          <th>Ação</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((document) => (
          <tr key={document.id}>
            <td>{document.originalName}</td>
            <td>{formatFileSize(document.size)}</td>
            <td>{formatDate(document.uploadedAt)}</td>
            <td>
              <DownloadButton
                userId={userId}
                documentId={document.id}
                fileName={document.originalName}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
