// React hook for audio playback using AudioWorklet
import { useState, useRef, useCallback, useEffect } from "react";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const workletNodeRef = useRef(null);
  const gainNodeRef = useRef(null);

  // Initialize audio context and playback worklet
  const initializeAudioPlayback = useCallback(async () => {
    try {
      // Create audio context with 24kHz sample rate to match recording
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)({
        sampleRate: 24000,
      });

      // Resume context if needed
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Load the audio playback worklet
      await audioContext.audioWorklet.addModule("/audio-playback-worklet.js");

      // Create the playback worklet node
      const workletNode = new AudioWorkletNode(
        audioContext,
        "audio-playback-worklet"
      );

      // Create a gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.0;

      // Connect worklet to output
      workletNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      workletNodeRef.current = workletNode;
      gainNodeRef.current = gainNode;

      console.log("[useAudioPlayer] Audio playback initialized");
      return audioContext;
    } catch (err) {
      console.error(
        "[useAudioPlayer] Failed to initialize audio playback:",
        err
      );
      setError(err.message || "Failed to initialize audio playback");
      throw err;
    }
  }, []);

  // Play an audio chunk (Base64 encoded PCM16)
  const playAudioChunk = useCallback(
    async (base64Audio) => {
      try {
        setError(null);

        // Initialize playback if not already done
        if (!audioContextRef.current || !workletNodeRef.current) {
          await initializeAudioPlayback();
        }

        // Decode Base64 to ArrayBuffer
        const binaryString = atob(base64Audio);
        const arrayBuffer = new ArrayBuffer(binaryString.length);
        const uint8View = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binaryString.length; i++) {
          uint8View[i] = binaryString.charCodeAt(i);
        }

        // Send audio data to the worklet for playback
        workletNodeRef.current.port.postMessage({
          type: "audiodata",
          data: arrayBuffer,
        });

        setIsPlaying(true);
      } catch (err) {
        console.error("[useAudioPlayer] Failed to play audio chunk:", err);
        setError(err.message || "Failed to play audio");
      }
    },
    [initializeAudioPlayback]
  );

  // Stop audio playback immediately
  const stopPlayback = useCallback(() => {
    try {
      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({
          type: "stop",
        });
      }

      setIsPlaying(false);
      console.log("[useAudioPlayer] Playback stopped");
    } catch (err) {
      console.error("[useAudioPlayer] Error stopping playback:", err);
      setError(err.message || "Error stopping playback");
    }
  }, []);

  // Clear playback queue but allow current buffer to finish
  const clearQueue = useCallback(() => {
    try {
      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({
          type: "clear",
        });
      }

      console.log("[useAudioPlayer] Playback queue cleared");
    } catch (err) {
      console.error("[useAudioPlayer] Error clearing queue:", err);
      setError(err.message || "Error clearing playback queue");
    }
  }, []);

  // Set playback volume (0.0 to 1.0)
  const setVolume = useCallback((volume) => {
    try {
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = Math.max(0, Math.min(1, volume));
      }
    } catch (err) {
      console.error("[useAudioPlayer] Error setting volume:", err);
    }
  }, []);

  // Cleanup audio resources
  const cleanup = useCallback(() => {
    try {
      // Stop any ongoing playback
      if (workletNodeRef.current) {
        workletNodeRef.current.port.postMessage({ type: "stop" });
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }

      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
        gainNodeRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close().catch((err) => {
          console.warn("[useAudioPlayer] Error closing audio context:", err);
        });
        audioContextRef.current = null;
      }

      setIsPlaying(false);
      console.log("[useAudioPlayer] Audio playback cleaned up");
    } catch (err) {
      console.error("[useAudioPlayer] Error during cleanup:", err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isPlaying,
    error,
    playAudioChunk,
    stopPlayback,
    clearQueue,
    setVolume,
    cleanup,
  };
}
