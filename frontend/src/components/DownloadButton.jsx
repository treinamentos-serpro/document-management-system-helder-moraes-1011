import { useState } from 'react';
import { downloadDocument } from '../services/api.js';

// Salva o Blob localmente usando um link temporário com o nome original do documento.
function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DownloadButton({ userId, documentId, fileName }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    setIsDownloading(true);
    setError(null);
    try {
      const blob = await downloadDocument(userId, documentId);
      saveBlob(blob, fileName);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={isDownloading}>
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <span role="alert"> {error}</span>}
    </>
  );
}
