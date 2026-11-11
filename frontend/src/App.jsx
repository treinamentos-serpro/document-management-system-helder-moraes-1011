import { useCallback, useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/api.js';

const DEFAULT_USER_ID = 'usuario-123';

export default function App() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const loadDocuments = useCallback(
    async (signal) => {
      setIsLoading(true);
      setListError(null);
      try {
        setDocuments(await listDocuments(userId, { signal }));
      } catch (error) {
        if (!signal?.aborted) {
          setListError(error.message);
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [userId]
  );

  // Recarrega a lista ao trocar de usuário, descartando respostas de requisições antigas.
  useEffect(() => {
    const controller = new AbortController();
    loadDocuments(controller.signal);
    return () => controller.abort();
  }, [loadDocuments]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Document Management System</h1>

      <label>
        Identificador do usuário (X-User-Id):{' '}
        <input
          type="text"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
      </label>

      <UploadComponent userId={userId} onUploaded={() => loadDocuments()} />

      <section>
        <h2>Meus documentos</h2>
        <DocumentList
          userId={userId}
          documents={documents}
          isLoading={isLoading}
          error={listError}
        />
      </section>
    </main>
  );
}
