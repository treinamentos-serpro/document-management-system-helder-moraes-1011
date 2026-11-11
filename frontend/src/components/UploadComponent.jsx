import { useState } from 'react';
import { uploadDocument } from '../services/api.js';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setFeedback({ type: 'error', text: 'Selecione um arquivo para enviar.' });
      return;
    }

    setIsUploading(true);
    setFeedback(null);
    try {
      const document = await uploadDocument(userId, file);
      setFeedback({ type: 'success', text: `"${document.originalName}" enviado com sucesso.` });
      setFile(null);
      form.reset();
      onUploaded?.(document);
    } catch (error) {
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section>
      <h2>Enviar documento</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          name="file"
          onChange={(event) => setFile(event.target.files[0] ?? null)}
          disabled={isUploading}
        />
        <button type="submit" disabled={isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
      {feedback && (
        <p role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.text}</p>
      )}
    </section>
  );
}
