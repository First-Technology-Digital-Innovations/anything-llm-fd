// React hooks for Azure OpenAI Realtime API voice chat
import { useState, useRef, useCallback, useEffect } from "react";

// Hook for managing the WebSocket connection to the Realtime API
export function useRealtime(sessionId, workspaceSlug, userId) {
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // 'disconnected', 'connecting', 'connected', 'error'
  const [isReady, setIsReady] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageHandlersRef = useRef(new Map());

  // Connect to the WebSocket middleware
  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    try {
      setConnectionStatus("connecting");

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = import.meta.env.DEV
        ? "localhost:3001"
        : window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/voice-chat/${sessionId}?workspace=${workspaceSlug}&userId=${userId || "anonymous"}`;

      const ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("Connection timeout"));
        }, 10000); // 10 second timeout

        ws.onopen = () => {
          clearTimeout(timeout);
          console.log("[useRealtime] Connected to voice chat WebSocket");
          setConnectionStatus("connected");
          setIsReady(true);
          wsRef.current = ws;
          resolve(ws);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Call registered message handlers
            messageHandlersRef.current.forEach((handler) => {
              try {
                handler(data);
              } catch (error) {
                console.error("[useRealtime] Message handler error:", error);
              }
            });
          } catch (error) {
            console.error("[useRealtime] Failed to parse message:", error);
          }
        };

        ws.onclose = (event) => {
          console.log(
            "[useRealtime] WebSocket closed:",
            event.code,
            event.reason
          );
          setConnectionStatus("disconnected");
          setIsReady(false);
          wsRef.current = null;

          // Attempt reconnect if it wasn't a clean close
          if (event.code !== 1000 && event.code !== 1001) {
            scheduleReconnect();
          }
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error("[useRealtime] WebSocket error:", error);
          setConnectionStatus("error");
          setIsReady(false);
          reject(error);
        };
      });
    } catch (error) {
      console.error("[useRealtime] Failed to connect:", error);
      setConnectionStatus("error");
      setIsReady(false);
      throw error;
    }
  }, [sessionId, workspaceSlug, userId]);

  // Schedule reconnection attempt
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log("[useRealtime] Attempting to reconnect...");
      connect().catch((error) => {
        console.error("[useRealtime] Reconnection failed:", error);
        // Try again with exponential backoff
        scheduleReconnect();
      });
    }, 3000);
  }, [connect]);

  // Start a new session
  const startSession = useCallback(async () => {
    try {
      const ws = await connect();

      // Send session configuration
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            voice: "alloy", // Can be made configurable
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200,
              create_response: true,
            },
            temperature: 0.8,
            max_response_output_tokens: 4096,
            tools: [],
          },
        })
      );

      return ws;
    } catch (error) {
      console.error("[useRealtime] Failed to start session:", error);
      throw error;
    }
  }, [connect]);

  // Add user audio to the session
  const addUserAudio = useCallback((audioData) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: audioData, // Base64 encoded PCM16
        })
      );
    }
  }, []);

  // Clear the input audio buffer
  const inputAudioBufferClear = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "input_audio_buffer.clear",
        })
      );
    }
  }, []);

  // Register a message handler
  const onMessage = useCallback((handler) => {
    const handlerId = Math.random().toString(36);
    messageHandlersRef.current.set(handlerId, handler);

    // Return unsubscribe function
    return () => {
      messageHandlersRef.current.delete(handlerId);
    };
  }, []);

  // Disconnect the WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected");
      wsRef.current = null;
    }

    setConnectionStatus("disconnected");
    setIsReady(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionStatus,
    isReady,
    connect,
    startSession,
    addUserAudio,
    inputAudioBufferClear,
    onMessage,
    disconnect,
  };
}
