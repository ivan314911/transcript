import { useState, useRef, useCallback } from "react";
import { pipeline } from "@xenova/transformers";

const MODEL_ID = "Xenova/whisper-base";

// Fallbacks webkit pour iOS Safari
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;

export function useWhisper() {
  const [modelState, setModelState] = useState("idle");
  const [loadProgress, setLoadProgress] = useState(0);
  const pipelineRef = useRef(null);

  const loadModel = useCallback(async () => {
    if (pipelineRef.current || modelState === "loading") return;
    setModelState("loading");
    setLoadProgress(0);

    try {
      pipelineRef.current = await pipeline(
        "automatic-speech-recognition",
        MODEL_ID,
        {
          progress_callback: (info) => {
            if (info.progress != null) {
              setLoadProgress(Math.round(info.progress));
            }
          },
        }
      );
      setModelState("ready");
    } catch (err) {
      console.error("Erreur chargement modèle Whisper :", err);
      setModelState("error");
    }
  }, [modelState]);

  const transcribe = useCallback(async (audioBlob) => {
    if (!pipelineRef.current) throw new Error("Modèle non chargé");

    // 1. Décoder le blob en AudioBuffer (avec fallback webkit iOS)
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new AudioCtx();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      audioCtx.close();
    }

    // 2. Rééchantillonner explicitement à 16kHz en mono via OfflineAudioContext
    //    (plus fiable que de laisser Transformers.js le faire lui-même)
    const TARGET_SR = 16000;
    const offlineCtx = new OfflineCtx(
      1, // mono
      Math.ceil(audioBuffer.duration * TARGET_SR),
      TARGET_SR
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const resampled = await offlineCtx.startRendering();
    const float32 = resampled.getChannelData(0);

    // 3. Transcrire — on passe directement du 16kHz, pas besoin de chunk pour < 30s
    const result = await pipelineRef.current(float32, {
      language: "french",
      task: "transcribe",
      sampling_rate: TARGET_SR,
    });

    return result.text.trim();
  }, []);

  return { modelState, loadProgress, loadModel, transcribe };
}
