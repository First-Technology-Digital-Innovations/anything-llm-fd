const { Telemetry } = require("../models/telemetry");
const { SystemSettings } = require("../models/systemSettings");
const { Workspace } = require("../models/workspace");
const { WorkspaceChats } = require("../models/workspaceChats");
const { safeJsonParse } = require("../utils/http");
const WebSocket = require("ws");

// Voice Chat Session Management
const voiceChatSessions = new Map();

class VoiceChatSession {
  constructor(sessionId, workspaceSlug, userId) {
    this.sessionId = sessionId;
    this.workspaceSlug = workspaceSlug;
    this.userId = userId;
    this.azureSocket = null;
    this.clientSocket = null;
    this.isConnected = false;
    this.sessionStartTime = Date.now();
    this.sessionTimeout = null;
    this.warningTimeout = null;
    this.conversationId = null;
  }

  async initialize() {
    try {
      const settings = await SystemSettings.currentSettings();

      if (
        !settings.VoiceChatEnabled ||
        !settings.AzureRealtimeEndpoint ||
        !settings.AzureRealtimeKey
      ) {
        throw new Error("Azure Realtime API not configured");
      }

      // Azure Realtime API WebSocket URL
      // For Azure OpenAI Service: wss://{resource}.openai.azure.com/openai/realtime?api-version=2024-10-01-preview&deployment={deployment}
      // For Azure AI Services: wss://{endpoint}/openai/realtime?api-version=2024-10-01-preview&deployment={deployment}
      const azureEndpoint = settings.AzureRealtimeEndpoint.replace(
        /^https?:\/\//,
        ""
      );
      const deploymentName =
        settings.AzureRealtimeModel || "gpt-4o-realtime-preview";
      const azureWsUrl = `wss://${azureEndpoint}/openai/realtime?api-version=2024-10-01-preview&deployment=${deploymentName}`;

      console.log(
        `Connecting to Azure Realtime API: wss://${azureEndpoint}/openai/realtime?api-version=2024-10-01-preview&deployment=${deploymentName}`
      );

      // Create WebSocket with API key header for Azure authentication
      this.azureSocket = new WebSocket(azureWsUrl, {
        headers: {
          "api-key": settings.AzureRealtimeKey,
        },
      });

      return new Promise((resolve, reject) => {
        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          console.error(
            `Azure WebSocket connection timeout for session ${this.sessionId}`
          );
          this.azureSocket.close();
          reject(
            new Error(
              "Azure connection timeout - check your endpoint and API key"
            )
          );
        }, 15000); // 15 second timeout

        this.azureSocket.on("open", () => {
          clearTimeout(connectionTimeout);
          console.log(
            `Voice chat session ${this.sessionId} connected to Azure Realtime API`
          );
          this.isConnected = true;
          this.setupSessionTimeout();
          this.initializeSession(settings);
          resolve(this);
        });

        this.azureSocket.on("error", (error) => {
          clearTimeout(connectionTimeout);
          console.error(
            `Azure WebSocket error for session ${this.sessionId}:`,
            error.message || error
          );
          reject(error);
        });

        this.azureSocket.on("close", (code, reason) => {
          console.log(
            `Azure WebSocket closed for session ${this.sessionId}. Code: ${code}, Reason: ${reason?.toString() || "unknown"}`
          );
          this.cleanup();
        });

        // Add unexpected response handler for debugging connection issues
        this.azureSocket.on("unexpected-response", (request, response) => {
          console.error(
            `Azure WebSocket unexpected response for session ${this.sessionId}:`
          );
          console.error(
            `  Status: ${response.statusCode} ${response.statusMessage}`
          );
          let body = "";
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            console.error(`  Body: ${body}`);
          });
          reject(
            new Error(
              `Azure connection failed: ${response.statusCode} ${response.statusMessage}`
            )
          );
        });

        this.azureSocket.on("message", (data) => {
          this.handleAzureMessage(data);
        });
      });
    } catch (error) {
      console.error(
        `Failed to initialize voice chat session ${this.sessionId}:`,
        error
      );
      throw error;
    }
  }

  initializeSession(settings) {
    // Configure Azure Realtime session
    const sessionConfig = {
      type: "session.update",
      session: {
        voice: settings.VoiceChatDefaultVoice || "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: {
          type: "server_vad",
          threshold: settings.VoiceChatVADThreshold || 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 200,
          create_response: true,
        },
        input_audio_transcription: {
          model: "whisper-1",
        },
        temperature: 0.8,
        max_response_output_tokens: "inf",
      },
    };

    this.sendToAzure(sessionConfig);
  }

  setupSessionTimeout() {
    const sessionTimeoutMs = 1500000; // 25 minutes
    const warningTimeMs = 1200000; // 20 minutes

    // Warning timeout (5 minutes before session ends)
    this.warningTimeout = setTimeout(() => {
      if (
        this.clientSocket &&
        this.clientSocket.readyState === WebSocket.OPEN
      ) {
        this.clientSocket.send(
          JSON.stringify({
            type: "session_warning",
            message: "Voice session will end in 5 minutes",
          })
        );
      }
    }, warningTimeMs);

    // Session timeout (25 minutes)
    this.sessionTimeout = setTimeout(() => {
      if (
        this.clientSocket &&
        this.clientSocket.readyState === WebSocket.OPEN
      ) {
        this.clientSocket.send(
          JSON.stringify({
            type: "session_timeout",
            message: "Voice session has ended due to timeout",
          })
        );
      }
      this.close();
    }, sessionTimeoutMs);
  }

  setClientSocket(socket) {
    this.clientSocket = socket;
  }

  sendToAzure(data) {
    if (this.azureSocket && this.azureSocket.readyState === WebSocket.OPEN) {
      this.azureSocket.send(JSON.stringify(data));
    }
  }

  sendToClient(data) {
    if (this.clientSocket && this.clientSocket.readyState === WebSocket.OPEN) {
      this.clientSocket.send(JSON.stringify(data));
    }
  }

  handleAzureMessage(data) {
    try {
      const message = JSON.parse(data);

      // Handle different Azure Realtime API events
      switch (message.type) {
        case "conversation.item.input_audio_transcription.completed":
          // User speech transcribed - forward to client and save to conversation
          this.handleTranscription(message);
          break;
        case "response.audio.delta":
          // Audio response chunk - forward to client
          this.sendToClient({
            type: "audio_response_chunk",
            audio: message.delta,
          });
          break;
        case "response.text.delta":
          // Text response chunk - forward to client
          this.sendToClient({
            type: "text_response_chunk",
            text: message.delta,
          });
          break;
        case "response.done":
          // Response complete - save to conversation
          this.handleResponseComplete(message);
          break;
        case "error":
          // Error from Azure - forward to client
          this.sendToClient({
            type: "error",
            error: message.error,
          });
          break;
        default:
          // Forward other events to client for debugging
          this.sendToClient(message);
          break;
      }
    } catch (error) {
      console.error(
        `Error handling Azure message for session ${this.sessionId}:`,
        error
      );
    }
  }

  async handleTranscription(message) {
    try {
      const transcription = message.transcript;
      if (!transcription) return;

      // Save user message to workspace thread
      const workspace = await Workspace.get({ slug: this.workspaceSlug });
      if (workspace) {
        await WorkspaceChats.new({
          workspaceId: workspace.id,
          prompt: transcription,
          response: null, // Will be filled when response completes
          user: { id: this.userId },
          threadId: null, // Use default thread
          chatMode: "chat",
        });
      }

      // Forward transcription to client
      this.sendToClient({
        type: "user_transcription",
        text: transcription,
      });
    } catch (error) {
      console.error(
        `Error handling transcription for session ${this.sessionId}:`,
        error
      );
    }
  }

  async handleResponseComplete(message) {
    try {
      // Extract response text from message
      const responseText = message.response?.output
        ?.find((item) => item.type === "message")
        ?.content?.find((part) => part.type === "text")?.text;

      if (responseText) {
        // Update the last chat entry with the response
        const workspace = await Workspace.get({ slug: this.workspaceSlug });
        if (workspace) {
          const lastChat = await WorkspaceChats.where(
            {
              workspaceId: workspace.id,
              user_id: this.userId,
              response: null,
            },
            1,
            { id: "desc" }
          );

          if (lastChat && lastChat.length > 0) {
            await WorkspaceChats.update(lastChat[0].id, {
              response: responseText,
              createdAt: new Date().toISOString(),
            });
          }
        }

        // Forward to client
        this.sendToClient({
          type: "response_complete",
          text: responseText,
        });
      }
    } catch (error) {
      console.error(
        `Error handling response complete for session ${this.sessionId}:`,
        error
      );
    }
  }

  handleClientMessage(data) {
    try {
      const message = safeJsonParse(data);
      if (!message) return;

      switch (message.type) {
        case "input_audio_buffer.append":
          // Forward audio input to Azure
          this.sendToAzure({
            type: "input_audio_buffer.append",
            audio: message.audio,
          });
          break;
        case "input_audio_buffer.commit":
          // Commit audio buffer to Azure
          this.sendToAzure({
            type: "input_audio_buffer.commit",
          });
          break;
        case "response.cancel":
          // Cancel current response
          this.sendToAzure({
            type: "response.cancel",
          });
          break;
        default:
          // Forward other messages to Azure
          this.sendToAzure(message);
          break;
      }
    } catch (error) {
      console.error(
        `Error handling client message for session ${this.sessionId}:`,
        error
      );
    }
  }

  close() {
    console.log(`Closing voice chat session ${this.sessionId}`);

    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    if (this.azureSocket) {
      this.azureSocket.close();
    }

    if (this.clientSocket) {
      this.clientSocket.close();
    }

    this.cleanup();
  }

  cleanup() {
    this.isConnected = false;
    voiceChatSessions.delete(this.sessionId);
  }

  static get(sessionId) {
    return voiceChatSessions.get(sessionId);
  }

  static create(sessionId, workspaceSlug, userId) {
    const session = new VoiceChatSession(sessionId, workspaceSlug, userId);
    voiceChatSessions.set(sessionId, session);
    return session;
  }

  static close(sessionId) {
    const session = voiceChatSessions.get(sessionId);
    if (session) {
      session.close();
    }
  }
}

function voiceChatWebSocket(app) {
  if (!app) return;

  app.ws("/voice-chat/:sessionId", async function (socket, request) {
    const sessionId = request.params.sessionId;
    const workspaceSlug = request.query.workspace;
    const userId = request.query.userId || null;

    try {
      if (!workspaceSlug) {
        socket.send(
          JSON.stringify({
            type: "error",
            error: { message: "Workspace slug is required" },
          })
        );
        socket.close();
        return;
      }

      // Check if voice chat is enabled
      const settings = await SystemSettings.currentSettings();
      if (!settings.VoiceChatEnabled) {
        socket.send(
          JSON.stringify({
            type: "error",
            error: { message: "Voice chat is not enabled" },
          })
        );
        socket.close();
        return;
      }

      // Create or get existing session
      let session = VoiceChatSession.get(sessionId);
      if (!session) {
        console.log(
          `Creating new voice chat session ${sessionId} for workspace ${workspaceSlug}`
        );
        session = VoiceChatSession.create(sessionId, workspaceSlug, userId);
        try {
          await session.initialize();
          console.log(
            `Voice chat session ${sessionId} initialized successfully`
          );
        } catch (initError) {
          console.error(
            `Failed to initialize voice chat session ${sessionId}:`,
            initError.message
          );
          socket.send(
            JSON.stringify({
              type: "error",
              error: {
                message: `Failed to connect to Azure Realtime API: ${initError.message}`,
              },
            })
          );
          socket.close();
          VoiceChatSession.close(sessionId);
          return;
        }
      }

      session.setClientSocket(socket);

      socket.on("message", (data) => {
        session.handleClientMessage(data);
      });

      socket.on("close", () => {
        console.log(`Client disconnected from voice chat session ${sessionId}`);
        // Keep Azure connection alive for potential reconnection
        // Only close Azure connection on timeout
      });

      // Send connection success to client
      socket.send(
        JSON.stringify({
          type: "connection_established",
          sessionId: sessionId,
        })
      );

      await Telemetry.sendTelemetry("voice_chat_started");
    } catch (error) {
      console.error(`Voice chat session error for ${sessionId}:`, error);
      socket?.send(
        JSON.stringify({
          type: "error",
          error: { message: error.message },
        })
      );
      socket?.close();
    }
  });
}

module.exports = { voiceChatWebSocket, VoiceChatSession };
