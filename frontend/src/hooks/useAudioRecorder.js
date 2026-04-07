// React hook for audio recording using AudioWorklet
import { useState, useRef, useCallback, useEffect } from "react";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const workletNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const onAudioDataRef = useRef(null);

  // Request microphone permission and setup audio processing
  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setHasPermission(true);
      setError(null);

      return true;
    } catch (err) {
      console.error("[useAudioRecorder] Microphone permission denied:", err);
      setHasPermission(false);
      setError(err.message || "Microphone access denied");
      return false;
    }
  }, []);

  // Initialize audio context and worklet
  const initializeAudioProcessing = useCallback(async () => {
    try {
      // Create audio context with 24kHz sample rate for optimal Realtime API performance
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)({
        sampleRate: 24000,
      });

      // Resume context if needed (required by some browsers)
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Load the audio processor worklet
      await audioContext.audioWorklet.addModule("/audio-processor-worklet.js");

      audioContextRef.current = audioContext;
      return audioContext;
    } catch (err) {
      console.error(
        "[useAudioRecorder] Failed to initialize audio processing:",
        err
      );
      setError(err.message || "Failed to initialize audio processing");
      throw err;
    }
  }, []);

  // Start recording audio
  const startRecording = useCallback(
    async (onAudioData) => {
      try {
        setError(null);

        // Store the audio data callback
        onAudioDataRef.current = onAudioData;

        // Request permission if not already granted
        if (hasPermission !== true) {
          const granted = await requestPermission();
          if (!granted) {
            throw new Error("Microphone permission required");
          }
        }

        // Initialize audio processing if needed
        if (!audioContextRef.current) {
          await initializeAudioProcessing();
        }

        const audioContext = audioContextRef.current;
        const stream = mediaStreamRef.current;

        // Create audio source from microphone
        const sourceNode = audioContext.createMediaStreamSource(stream);
        sourceNodeRef.current = sourceNode;

        // Create the audio processor worklet node
        const workletNode = new AudioWorkletNode(
          audioContext,
          "audio-processor-worklet"
        );
        workletNodeRef.current = workletNode;

        // Handle audio data from the worklet
        workletNode.port.onmessage = (event) => {
          const { type, data } = event.data;

          if (type === "audiodata" && onAudioDataRef.current) {
            // Convert ArrayBuffer to Base64 for transmission
            const uint8Array = new Uint8Array(data);
            const binaryString = Array.from(uint8Array, (byte) =>
              String.fromCharCode(byte)
            ).join("");
            const base64Audio = btoa(binaryString);

            onAudioDataRef.current(base64Audio);
          }
        };

        // Connect the audio processing chain
        sourceNode.connect(workletNode);

        setIsRecording(true);
        console.log("[useAudioRecorder] Recording started");
      } catch (err) {
        console.error("[useAudioRecorder] Failed to start recording:", err);
        setError(err.message || "Failed to start recording");
        setIsRecording(false);
        throw err;
      }
    },
    [hasPermission, requestPermission, initializeAudioProcessing]
  );

  // Stop recording audio
  const stopRecording = useCallback(() => {
    try {
      // Disconnect audio nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }

      // Stop media stream tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        mediaStreamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch((err) => {
          console.warn("[useAudioRecorder] Error closing audio context:", err);
        });
        audioContextRef.current = null;
      }

      setIsRecording(false);
      setHasPermission(null);
      onAudioDataRef.current = null;

      console.log("[useAudioRecorder] Recording stopped");
    } catch (err) {
      console.error("[useAudioRecorder] Error stopping recording:", err);
      setError(err.message || "Error stopping recording");
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    hasPermission,
    error,
    requestPermission,
    startRecording,
    stopRecording,
  };
}
