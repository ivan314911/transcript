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
    let arrayBuffer;
    try {
      arrayBuffer = await audioBlob.arrayBuffer();
    } catch (err) {
      throw new Error(`Lecture audio impossible : ${err.message}`);
    }

    const audioCtx = new AudioCtx();
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (err) {
      throw new Error(`Décodage audio impossible : ${err.message}`);
    } finally {
      audioCtx.close();
    }

    // 2. Rééchantillonner à 16kHz mono via OfflineAudioContext
    const TARGET_SR = 16000;
    let float32;
    try {
      const offlineCtx = new OfflineCtx(
        1,
        Math.ceil(audioBuffer.duration * TARGET_SR),
        TARGET_SR
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      const resampled = await offlineCtx.startRendering();
      float32 = resampled.getChannelData(0);
    } catch (err) {
      throw new Error(`Rééchantillonnage impossible : ${err.message}`);
    }

    // 3. Transcrire
    try {
      const result = await pipelineRef.current(float32, {
        language: "french",
        task: "transcribe",
        sampling_rate: TARGET_SR,
      });
      return result.text.trim();
    } catch (err) {
      throw new Error(`Transcription impossible : ${err.message}`);
    }
  }, []);

  return { modelState, loadProgress, loadModel, transcribe };
}
