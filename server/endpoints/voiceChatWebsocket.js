const { Telemetry } = require("../models/telemetry");
const { SystemSettings } = require("../models/systemSettings");
const { Workspace } = require("../models/workspace");
const { WorkspaceChats } = require("../models/workspaceChats");
const { WorkspaceThread } = require("../models/workspaceThread");
const { safeJsonParse } = require("../utils/http");
const WebSocket = require("ws");

/**
 * Mask API key for secure logging
 * @param {string} key - The API key to mask
 * @returns {string} Masked key showing only first 4 and last 4 characters
 */
function maskApiKey(key) {
  if (!key || key.length < 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

/**
 * Wrap SDK errors with user-friendly messages
 * @param {Error} err - The error to wrap
 * @returns {Object} User-friendly error object with message, code, and details
 */
function wrapRealtimeError(err) {
  if (!err) return { message: "Unknown error occurred" };

  const errorMessage = err.message || err.cause?.message || String(err);
  const errorLower = errorMessage.toLowerCase();

  // Authentication errors
  if (
    errorLower.includes("401") ||
    errorLower.includes("unauthorized") ||
    errorLower.includes("api key") ||
    errorLower.includes("authentication")
  ) {
    return {
      message: "Authentication failed. Please check your Azure API key.",
      code: "AUTH_ERROR",
      details: errorMessage,
    };
  }

  // Connection/endpoint errors
  if (
    errorLower.includes("404") ||
    errorLower.includes("not found") ||
    errorLower.includes("endpoint")
  ) {
    return {
      message:
        "Azure endpoint not found. Please verify your endpoint configuration.",
      code: "ENDPOINT_ERROR",
      details: errorMessage,
    };
  }

  // Timeout errors
  if (errorLower.includes("timeout") || errorLower.includes("timed out")) {
    return {
      message: "Connection timed out. Please check your network and try again.",
      code: "TIMEOUT_ERROR",
      details: errorMessage,
    };
  }

  // Rate limit errors
  if (
    errorLower.includes("429") ||
    errorLower.includes("rate limit") ||
    errorLower.includes("quota")
  ) {
    return {
      message: "Rate limit exceeded. Please wait a moment and try again.",
      code: "RATE_LIMIT_ERROR",
      details: errorMessage,
    };
  }

  // Model/deployment errors
  if (
    errorLower.includes("model") ||
    errorLower.includes("deployment") ||
    errorLower.includes("not deployed")
  ) {
    return {
      message:
        "Model deployment not available. Please check your Azure deployment configuration.",
      code: "DEPLOYMENT_ERROR",
      details: errorMessage,
    };
  }

  // WebSocket connection errors
  if (
    errorLower.includes("websocket") ||
    errorLower.includes("connection refused") ||
    errorLower.includes("econnrefused")
  ) {
    return {
      message: "Unable to establish WebSocket connection to Azure.",
      code: "CONNECTION_ERROR",
      details: errorMessage,
    };
  }

  // Generic error
  return {
    message: "Voice chat connection failed. Please try again.",
    code: "UNKNOWN_ERROR",
    details: errorMessage,
  };
}

// Voice Chat Session Management
const voiceChatSessions = new Map();

class VoiceChatSession {
  constructor(sessionId, workspaceSlug, userId, threadSlug = null) {
    this.sessionId = sessionId;
    this.workspaceSlug = workspaceSlug;
    // Parse userId to Int for Prisma, null for anonymous/NaN
    this.userId =
      userId && !isNaN(parseInt(userId, 10)) ? parseInt(userId, 10) : null;
    // Parse threadSlug (will be resolved to threadId during initialization)
    this.threadSlug = threadSlug;
    this.threadId = null;
    this.realtimeClient = null;
    this.clientSocket = null;
    this.isConnected = false;
    this.sessionStartTime = Date.now();
    this.sessionTimeout = null;
    this.warningTimeout = null;
    this.conversationId = null;
    this.settings = null;
    this.workspace = null;
    // Track pending transcripts for proper message saving
    this.pendingUserTranscript = null;
    this.pendingAITranscript = "";
  }

  async initialize() {
    try {
      const settings = await SystemSettings.currentSettings();
      this.settings = settings;

      if (
        !settings.VoiceChatEnabled ||
        !settings.AzureRealtimeEndpoint ||
        !settings.AzureRealtimeKey
      ) {
        throw new Error("Azure Realtime API not configured");
      }

      // Load workspace configuration
      this.workspace = await Workspace.get({ slug: this.workspaceSlug });
      if (!this.workspace) {
        throw new Error(`Workspace '${this.workspaceSlug}' not found`);
      }

      // Resolve threadSlug to threadId if provided
      if (this.threadSlug) {
        const thread = await WorkspaceThread.get({ slug: this.threadSlug });
        if (thread) {
          this.threadId = thread.id;
          console.log(
            `[VoiceChat] Resolved thread slug '${this.threadSlug}' to ID ${this.threadId}`
          );
        } else {
          console.warn(
            `[VoiceChat] Thread slug '${this.threadSlug}' not found, using default thread`
          );
        }
      }

      // Load chat history for context
      const historyLimit = this.workspace.openAiHistory || 20;
      let chatHistory = [];

      if (this.threadId) {
        // Load thread-specific history
        chatHistory = await WorkspaceChats.where(
          {
            workspaceId: this.workspace.id,
            thread_id: this.threadId,
            include: true,
          },
          historyLimit,
          { id: "desc" }
        );
      } else if (this.userId) {
        // Load user's default thread history
        chatHistory = await WorkspaceChats.forWorkspaceByUser(
          this.workspace.id,
          this.userId,
          historyLimit,
          { id: "desc" }
        );
      } else {
        // Load workspace default history
        chatHistory = await WorkspaceChats.forWorkspace(
          this.workspace.id,
          historyLimit,
          { id: "desc" }
        );
      }

      // Reverse to get chronological order
      this.chatHistory = chatHistory.reverse();
      console.log(
        `[VoiceChat] Loaded ${this.chatHistory.length} history messages for context`
      );

      // Clean the endpoint - remove any protocol prefix and trailing paths
      const azureEndpoint = settings.AzureRealtimeEndpoint.replace(
        /^https?:\/\//,
        ""
      )
        .replace(/\/openai.*$/, "")
        .replace(/\/$/, "");

      const deploymentName = settings.AzureRealtimeModel || "gpt-realtime";
      const apiKey = settings.AzureRealtimeKey;

      // Azure OpenAI API version for realtime
      const apiVersion = "2024-10-01-preview";

      // Construct the correct Azure OpenAI Realtime WebSocket URL
      const realtimeUrl = `wss://${azureEndpoint}/openai/realtime?api-version=${apiVersion}&deployment=${deploymentName}`;

      console.log(`[VoiceChat] Connecting to Azure Realtime API`);
      console.log(`[VoiceChat] Endpoint: ${azureEndpoint}`);
      console.log(`[VoiceChat] Deployment: ${deploymentName}`);
      console.log(`[VoiceChat] API Key: ${maskApiKey(apiKey)}`);
      console.log(`[VoiceChat] API Version: ${apiVersion}`);
      console.log(`[VoiceChat] WebSocket URL: ${realtimeUrl}`);

      // Create raw WebSocket connection to Azure OpenAI Realtime API
      // (The OpenAI SDK's azure() method constructs wrong URL, so we use raw WebSocket)
      return new Promise((resolve, reject) => {
        this.realtimeClient = new WebSocket(realtimeUrl, {
          headers: {
            "api-key": apiKey,
          },
        });

        this.realtimeClient.on("open", () => {
          console.log(
            `[VoiceChat] Voice chat session ${this.sessionId} connected to Azure Realtime API`
          );

          // Set up event handlers for Azure messages
          this.setupEventHandlers();

          this.isConnected = true;
          this.setupSessionTimeout();

          // Configure the session
          this.initializeSession(settings);

          resolve(this);
        });

        this.realtimeClient.on("error", (err) => {
          console.error(
            `[VoiceChat] Failed to connect to Azure Realtime API:`,
            err.message
          );
          const wrappedError = wrapRealtimeError(err);
          reject(new Error(wrappedError.message));
        });

        // Handle connection close during initialization
        this.realtimeClient.on("close", (code, reason) => {
          if (!this.isConnected) {
            reject(
              new Error(`Connection closed during initialization: ${code}`)
            );
          }
        });
      });
    } catch (error) {
      console.error(
        `[VoiceChat] Failed to initialize voice chat session ${this.sessionId}:`,
        error.message
      );
      console.error(`[VoiceChat] Full error:`, error);
      if (error.cause) {
        console.error(`[VoiceChat] Error cause:`, error.cause);
      }
      const wrappedError = wrapRealtimeError(error);
      throw new Error(wrappedError.message);
    }
  }

  setupEventHandlers() {
    if (!this.realtimeClient) return;

    // Handle incoming messages from Azure
    this.realtimeClient.on("message", (data) => {
      try {
        const event = JSON.parse(data.toString());
        this.handleAzureEvent(event);
      } catch (err) {
        console.error(
          `[VoiceChat] Failed to parse Azure message for session ${this.sessionId}:`,
          err.message
        );
      }
    });

    // Handle errors
    this.realtimeClient.on("error", (err) => {
      console.error(
        `[VoiceChat] Azure Realtime error for session ${this.sessionId}:`,
        err.message || err
      );
      const wrappedError = wrapRealtimeError(err);
      this.sendToClient({
        type: "error",
        error: wrappedError,
      });
    });

    // Handle connection close
    this.realtimeClient.on("close", (code, reason) => {
      console.log(
        `[VoiceChat] Azure connection closed for session ${this.sessionId}: ${code}`
      );
      this.isConnected = false;
      this.sendToClient({
        type: "azure_disconnected",
        code: code,
        reason: reason?.toString() || "",
      });
    });
  }

  /**
   * Handle events received from Azure Realtime API
   */
  handleAzureEvent(event) {
    const eventType = event.type;

    switch (eventType) {
      case "session.created":
        console.log(
          `[VoiceChat] Session created for ${this.sessionId}: ${event.session?.id}`
        );
        break;

      case "session.updated":
        console.log(
          `[VoiceChat] Voice session ${this.sessionId} configuration updated`
        );
        this.sendToClient({
          type: "session_configured",
          message: "Voice session ready",
        });
        break;

      case "response.audio.delta":
        this.sendToClient({
          type: "audio_response_chunk",
          audio: event.delta,
        });
        break;

      case "response.audio.done":
        this.sendToClient({
          type: "audio_response_done",
          response_id: event.response_id,
          item_id: event.item_id,
        });
        break;

      case "response.audio_transcript.delta":
        // Accumulate AI transcript chunks
        if (event.delta) {
          this.pendingAITranscript += event.delta;
        }
        this.sendToClient({
          type: "audio_transcript_chunk",
          transcript: event.delta,
        });
        break;

      case "response.audio_transcript.done":
        // Final AI transcript is now complete
        this.sendToClient({
          type: "audio_transcript_done",
          transcript: event.transcript,
        });
        break;

      case "response.text.delta":
        this.sendToClient({
          type: "text_response_chunk",
          text: event.delta,
        });
        break;

      case "conversation.item.input_audio_transcription.completed":
        this.handleTranscription(event);
        break;

      case "input_audio_buffer.speech_started":
        // User started speaking (barge-in) — forward to client so it stops audio playback
        console.log(
          `[VoiceChat] User barge-in detected for session ${this.sessionId}`
        );
        this.pendingAITranscript = "";
        this.sendToClient({
          type: "input_audio_buffer.speech_started",
        });
        break;

      case "input_audio_buffer.speech_stopped":
        // User stopped speaking — forward to client for UI state update
        this.sendToClient({
          type: "input_audio_buffer.speech_stopped",
        });
        break;

      case "response.done":
        this.handleResponseComplete(event);
        break;

      case "error":
        console.error(
          `[VoiceChat] Azure error for session ${this.sessionId}:`,
          event.error
        );
        this.sendToClient({
          type: "error",
          error: {
            message: event.error?.message || "Azure error occurred",
            code: event.error?.code || "AZURE_ERROR",
          },
        });
        break;

      default:
        // Log other events for debugging
        if (
          eventType.startsWith("response.") ||
          eventType.startsWith("conversation.") ||
          eventType.startsWith("input_audio_buffer.")
        ) {
          console.log(
            `[VoiceChat] Azure event for session ${this.sessionId}: ${eventType}`
          );
        }
        break;
    }
  }

  initializeSession(settings) {
    // Get workspace system prompt or use default
    const systemPrompt =
      this.workspace?.openAiPrompt ||
      "You are a helpful AI assistant. Respond naturally and conversationally.";

    // Parse configurable parameters from settings (matching Azure model deployment)
    const vadThreshold = parseFloat(settings.VoiceChatVADThreshold) || 0.5;
    const prefixPaddingMs =
      parseInt(settings.VoiceChatVADPrefixPaddingMs) || 200;
    const silenceDurationMs =
      parseInt(settings.VoiceChatVADSilenceDurationMs) || 300;
    const temperature = parseFloat(settings.VoiceChatTemperature) || 0.7;
    const maxResponseTokens =
      settings.VoiceChatMaxResponseTokens === "inf"
        ? "inf"
        : parseInt(settings.VoiceChatMaxResponseTokens) || 1638;

    // Configure Azure Realtime session using the SDK's send method
    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: systemPrompt,
        voice: settings.VoiceChatDefaultVoice || "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: {
          type: "server_vad",
          threshold: vadThreshold,
          prefix_padding_ms: prefixPaddingMs,
          silence_duration_ms: silenceDurationMs,
          create_response: true,
        },
        input_audio_transcription: {
          model: "whisper-1",
        },
        temperature: temperature,
        max_response_output_tokens: maxResponseTokens,
      },
    };

    console.log(
      `[VoiceChat] Initializing voice session ${this.sessionId} with workspace prompt`
    );
    this.sendToAzure(sessionConfig);

    // Inject chat history as conversation items after session is configured
    if (this.chatHistory && this.chatHistory.length > 0) {
      console.log(
        `[VoiceChat] Injecting ${this.chatHistory.length} history items into conversation`
      );
      this.injectChatHistory();
    }
  }

  /**
   * Inject chat history into Azure Realtime session as conversation items
   */
  injectChatHistory() {
    if (!this.chatHistory || this.chatHistory.length === 0) return;

    for (const chat of this.chatHistory) {
      // Inject user message
      if (chat.prompt) {
        this.sendToAzure({
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: chat.prompt,
              },
            ],
          },
        });
      }

      // Inject assistant response
      if (chat.response) {
        try {
          const responseData =
            typeof chat.response === "string"
              ? JSON.parse(chat.response)
              : chat.response;
          const responseText =
            responseData?.text ||
            responseData?.textResponse ||
            String(responseData);

          if (
            responseText &&
            responseText !== "null" &&
            responseText !== "undefined"
          ) {
            this.sendToAzure({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: responseText,
                  },
                ],
              },
            });
          }
        } catch (e) {
          // If response is plain text, use it directly
          if (typeof chat.response === "string" && chat.response.trim()) {
            this.sendToAzure({
              type: "conversation.item.create",
              item: {
                type: "message",
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: chat.response,
                  },
                ],
              },
            });
          }
        }
      }
    }

    console.log(`[VoiceChat] Chat history injection complete`);
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
    if (
      this.realtimeClient &&
      this.realtimeClient.readyState === WebSocket.OPEN
    ) {
      try {
        const message = typeof data === "string" ? data : JSON.stringify(data);
        this.realtimeClient.send(message);
        console.log(
          `[VoiceChat] Sent to Azure for session ${this.sessionId}: ${data.type || "unknown"}`
        );
      } catch (error) {
        console.error(
          `[VoiceChat] Error sending to Azure for session ${this.sessionId}:`,
          error.message
        );
      }
    } else {
      console.error(
        `[VoiceChat] Cannot send to Azure - WebSocket not open for session ${this.sessionId}`
      );
    }
  }

  sendToClient(data) {
    if (this.clientSocket && this.clientSocket.readyState === WebSocket.OPEN) {
      this.clientSocket.send(JSON.stringify(data));
    }
  }

  async handleTranscription(event) {
    try {
      const transcription = event.transcript;
      if (!transcription) return;

      // Store pending user transcript - will be saved when response completes
      this.pendingUserTranscript = transcription;
      // Reset AI transcript accumulator for new response
      this.pendingAITranscript = "";

      console.log(
        `[VoiceChat] User transcription received: "${transcription.substring(0, 50)}..."`
      );

      // Forward transcription to client
      this.sendToClient({
        type: "user_transcription",
        text: transcription,
      });
    } catch (error) {
      console.error(
        `[VoiceChat] Error handling transcription for session ${this.sessionId}:`,
        error
      );
    }
  }

  async handleResponseComplete(event) {
    try {
      // If the response was cancelled (e.g. user barge-in), skip saving
      const status = event.response?.status;
      if (status === "cancelled") {
        console.log(
          `[VoiceChat] Response was cancelled (barge-in) for session ${this.sessionId}`
        );
        this.pendingAITranscript = "";
        this.sendToClient({
          type: "response_complete",
          text: "",
          cancelled: true,
        });
        return;
      }

      // Get final transcript from accumulated chunks or from event
      // Use accumulated transcript if available, fall back to extracting from event
      let responseText = this.pendingAITranscript;

      if (!responseText) {
        // Try to extract from response.done event structure
        responseText = event.response?.output
          ?.find((item) => item.type === "message")
          ?.content?.find(
            (part) => part.type === "text" || part.type === "audio"
          )?.text;
      }

      // Only save if we have both user prompt and AI response
      if (this.pendingUserTranscript && responseText) {
        console.log(`[VoiceChat] Saving voice chat exchange to database`);

        // Save complete exchange with type: "voice" marker
        const { chat } = await WorkspaceChats.new({
          workspaceId: this.workspace.id,
          prompt: this.pendingUserTranscript,
          response: {
            text: responseText,
            sources: [],
            type: "voice",
          },
          user: this.userId ? { id: this.userId } : null,
          threadId: this.threadId,
        });

        if (chat) {
          console.log(`[VoiceChat] Voice chat saved with ID: ${chat.id}`);

          // Send chat_saved message to frontend for history refresh
          this.sendToClient({
            type: "chat_saved",
            chatId: chat.id,
            prompt: this.pendingUserTranscript,
            response: responseText,
            threadId: this.threadId,
          });
        }

        // Clear pending transcripts
        this.pendingUserTranscript = null;
        this.pendingAITranscript = "";
      } else if (responseText) {
        console.log(
          `[VoiceChat] Response complete but no pending user transcript to pair with`
        );
      }

      // Forward to client
      this.sendToClient({
        type: "response_complete",
        text: responseText || "",
      });
    } catch (error) {
      console.error(
        `[VoiceChat] Error handling response complete for session ${this.sessionId}:`,
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
        `[VoiceChat] Error handling client message for session ${this.sessionId}:`,
        error
      );
    }
  }

  close() {
    console.log(`[VoiceChat] Closing voice chat session ${this.sessionId}`);

    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    if (this.warningTimeout) {
      clearTimeout(this.warningTimeout);
    }

    if (this.realtimeClient) {
      try {
        this.realtimeClient.close();
      } catch (error) {
        console.error(
          `[VoiceChat] Error closing realtime client for session ${this.sessionId}:`,
          error.message
        );
      }
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

  static create(sessionId, workspaceSlug, userId, threadSlug = null) {
    const session = new VoiceChatSession(
      sessionId,
      workspaceSlug,
      userId,
      threadSlug
    );
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
    const threadSlug = request.query.threadSlug || null;

    console.log(
      `[VoiceChat] WebSocket connection attempt - Session: ${sessionId}, Workspace: ${workspaceSlug}, User: ${userId}, Thread: ${threadSlug}`
    );

    try {
      if (!workspaceSlug) {
        console.error(
          `[VoiceChat] Missing workspace slug for session ${sessionId}`
        );
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
      console.log(
        `[VoiceChat] Settings check - VoiceChatEnabled: ${settings.VoiceChatEnabled}, AzureEndpoint: ${settings.AzureRealtimeEndpoint ? "SET" : "NOT SET"}, AzureKey: ${settings.AzureRealtimeKey ? "SET" : "NOT SET"}`
      );

      if (!settings.VoiceChatEnabled) {
        console.error(
          `[VoiceChat] Voice chat disabled for session ${sessionId}`
        );
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
          `[VoiceChat] Creating new voice chat session ${sessionId} for workspace ${workspaceSlug} thread ${threadSlug || "default"}`
        );
        session = VoiceChatSession.create(
          sessionId,
          workspaceSlug,
          userId,
          threadSlug
        );
        try {
          console.log(`[VoiceChat] Initializing session ${sessionId}...`);
          await session.initialize();
          console.log(
            `[VoiceChat] Voice chat session ${sessionId} initialized successfully`
          );
        } catch (initError) {
          console.error(
            `[VoiceChat] Failed to initialize voice chat session ${sessionId}:`,
            initError.message
          );
          socket.send(
            JSON.stringify({
              type: "error",
              error: {
                message: initError.message,
              },
            })
          );
          socket.close();
          VoiceChatSession.close(sessionId);
          return;
        }
      } else {
        console.log(`[VoiceChat] Reusing existing session ${sessionId}`);
      }

      session.setClientSocket(socket);

      socket.on("message", (data) => {
        session.handleClientMessage(data);
      });

      socket.on("close", () => {
        console.log(
          `[VoiceChat] Client disconnected from voice chat session ${sessionId}`
        );
        // Keep Azure connection alive for potential reconnection
        // Only close Azure connection on timeout
      });

      // Send connection success to client
      console.log(
        `[VoiceChat] Sending connection success to client for session ${sessionId}`
      );
      socket.send(
        JSON.stringify({
          type: "connection_established",
          sessionId: sessionId,
        })
      );

      await Telemetry.sendTelemetry("voice_chat_started");
    } catch (error) {
      console.error(
        `[VoiceChat] Voice chat session error for ${sessionId}:`,
        error
      );
      const wrappedError = wrapRealtimeError(error);
      socket?.send(
        JSON.stringify({
          type: "error",
          error: wrappedError,
        })
      );
      socket?.close();
    }
  });
}

module.exports = {
  voiceChatWebSocket,
  VoiceChatSession,
  maskApiKey,
  wrapRealtimeError,
};
