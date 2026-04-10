import { useState, useRef, useCallback } from "react";
import { pipeline } from "@xenova/transformers";

// Modèle Whisper tiny — ~40 Mo, bon support français, rapide sur mobile
const MODEL_ID = "Xenova/whisper-tiny";

export function useWhisper() {
  const [modelState, setModelState] = useState("idle"); // idle | loading | ready | error
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

    // Décoder le blob audio en PCM Float32
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new AudioContext();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    await audioCtx.close();

    // Mixer en mono
    let float32;
    if (audioBuffer.numberOfChannels === 1) {
      float32 = audioBuffer.getChannelData(0);
    } else {
      float32 = new Float32Array(audioBuffer.length);
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const channel = audioBuffer.getChannelData(ch);
        for (let i = 0; i < channel.length; i++) {
          float32[i] += channel[i] / audioBuffer.numberOfChannels;
        }
      }
    }

    const result = await pipelineRef.current(float32, {
      language: "french",
      task: "transcribe",
      sampling_rate: audioBuffer.sampleRate,
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    return result.text.trim();
  }, []);

  return { modelState, loadProgress, loadModel, transcribe };
}
