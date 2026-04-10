import { useState, useCallback, useEffect } from "react";
import { useRecorder } from "./useRecorder.js";
import { useWhisper } from "./useWhisper.js";
import { saveNote, loadNotes, deleteNote } from "./db.js";
import "./App.css";

const VERSION = 6;

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDate(date) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const { state: recState, audioBlob, audioUrl, duration, start, stop, reset: resetRecorder } = useRecorder();
  const { modelState, loadProgress, loadModel, transcribe } = useWhisper();

  const [transcribing, setTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadModel();
    loadNotes().then(setNotes).catch(console.error);
  }, []);

  const handleStart = useCallback(async () => {
    setError("");
    try {
      await start();
    } catch {
      setError("Impossible d'accéder au microphone. Vérifiez les permissions.");
    }
  }, [start]);

  const handleStop = useCallback(() => stop(), [stop]);

  const handleTranscribe = useCallback(async () => {
    if (!audioBlob) return;
    setError("");
    setTranscribing(true);
    try {
      const text = await transcribe(audioBlob);
      setTranscription(text);
      setEditingText(text);
    } catch (err) {
      setError(err.message || "Erreur lors de la transcription.");
    } finally {
      setTranscribing(false);
    }
  }, [audioBlob, transcribe]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    resetRecorder();
    setTranscribing(true);
    setTranscription(null);
    try {
      const text = await transcribe(file);
      setTranscription(text);
      setEditingText(text);
    } catch (err) {
      setError(err.message || "Erreur lors de la transcription.");
    } finally {
      setTranscribing(false);
    }
  }, [transcribe, resetRecorder]);

  const handleSave = useCallback(async () => {
    const note = {
      id: Date.now(),
      date: new Date().toISOString(),
      text: editingText,
      duration,
      // On stocke l'audio en ArrayBuffer pour IndexedDB
      audioData: audioBlob ? await audioBlob.arrayBuffer() : null,
      audioType: audioBlob?.type || null,
    };
    await saveNote(note);
    setNotes((prev) => [note, ...prev]);
    setTranscription(null);
    setEditingText("");
    resetRecorder();
  }, [editingText, duration, audioBlob, resetRecorder]);

  const handleNew = useCallback(() => {
    setTranscription(null);
    setEditingText("");
    setError("");
    resetRecorder();
  }, [resetRecorder]);

  const handleDeleteNote = useCallback(async (id) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleDownloadText = useCallback((note) => {
    const blob = new Blob(
      [`Date : ${formatDate(note.date)}\n\n${note.text}`],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `note-${note.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadAudio = useCallback((note) => {
    if (!note.audioData) return;
    const blob = new Blob([note.audioData], { type: note.audioType || "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enregistrement-${note.id}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const isModelReady = modelState === "ready";
  const showResult = !!transcription && !transcribing;

  return (
    <div className="app">
      <header className="header">
        <h1>Notes de réunion</h1>
        <ModelBadge state={modelState} progress={loadProgress} />
        <span className="version">v{VERSION}</span>
      </header>

      <main className="main">
        <section className="card">
          {recState === "idle" && !transcription && !transcribing && (
            <div className="centered-col">
              <button
                className="btn btn-record"
                onClick={handleStart}
                disabled={!isModelReady}
              >
                <span aria-hidden>🎙</span>
                {isModelReady ? "Démarrer l'enregistrement" : "Chargement du modèle…"}
              </button>
              <label className="upload-label">
                <input
                  type="file"
                  accept="audio/*"
                  className="upload-input"
                  onChange={handleFileUpload}
                  disabled={!isModelReady || transcribing}
                />
                Ou importer un fichier audio
              </label>
            </div>
          )}

          {recState === "recording" && (
            <div className="centered-col">
              <div className="recording-row">
                <span className="pulse-dot" />
                Enregistrement en cours…
              </div>
              <div className="timer">{formatDuration(duration)}</div>
              <button className="btn btn-stop" onClick={handleStop}>
                Arrêter
              </button>
            </div>
          )}

          {recState === "stopped" && !transcription && (
            <div className="centered-col">
              <audio controls src={audioUrl} className="audio-player" />
              {transcribing ? (
                <div className="centered-col">
                  <div className="spinner" />
                  <p className="hint">Transcription en cours…</p>
                </div>
              ) : (
                <div className="row-gap">
                  <button className="btn btn-primary" onClick={handleTranscribe}>
                    Transcrire
                  </button>
                  <button className="btn btn-ghost" onClick={handleNew}>
                    Recommencer
                  </button>
                </div>
              )}
            </div>
          )}

          {transcribing && recState === "idle" && (
            <div className="centered-col">
              <div className="spinner" />
              <p className="hint">Transcription en cours…</p>
            </div>
          )}
        </section>

        {error && (
          <div className="error-box">
            <p>{error}</p>
            <button className="btn btn-ghost btn-small" onClick={handleNew}>
              Réessayer
            </button>
          </div>
        )}

        {showResult && (
          <section className="card">
            <div className="section-header">
              <h2>Transcription</h2>
              {duration > 0 && <span className="meta">{formatDuration(duration)}</span>}
            </div>
            <textarea
              className="transcription-text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              rows={10}
            />
            <div className="row-gap" style={{ marginTop: "0.75rem" }}>
              <button className="btn btn-primary" onClick={handleSave}>
                Sauvegarder
              </button>
              <button className="btn btn-ghost" onClick={handleNew}>
                Nouvelle réunion
              </button>
            </div>
          </section>
        )}

        {notes.length > 0 && (
          <section>
            <h2 className="section-title">Notes sauvegardées</h2>
            {notes.map((note) => (
              <div key={note.id} className="card note-card">
                <div className="section-header">
                  <span className="meta">{formatDate(note.date)}</span>
                  {note.duration > 0 && (
                    <span className="meta">{formatDuration(note.duration)}</span>
                  )}
                </div>
                <p className="note-preview">{note.text}</p>
                <div className="row-gap" style={{ justifyContent: "flex-end" }}>
                  <button className="btn btn-ghost btn-small" onClick={() => handleDownloadText(note)}>
                    Texte
                  </button>
                  {note.audioData && (
                    <button className="btn btn-ghost btn-small" onClick={() => handleDownloadAudio(note)}>
                      Audio
                    </button>
                  )}
                  <button className="btn btn-danger btn-small" onClick={() => handleDeleteNote(note.id)}>
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function ModelBadge({ state, progress }) {
  if (state === "ready") return <span className="badge badge-ready">IA prête</span>;
  if (state === "loading") return <span className="badge badge-loading">Chargement {progress}%</span>;
  if (state === "error") return <span className="badge badge-error">Erreur modèle</span>;
  return null;
}
