import { Tooltip } from "react-tooltip";
import { Microphone, MicrophoneSlash, WifiHigh, WifiSlash } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";
import { useRef, useEffect, useState } from "react";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import Workspace from "@/models/workspace";
import showToast from "@/utils/toast";

export default function VoiceChatToggleAction({ workspace, onVoiceChatToggle = () => {} }) {
  const tooltipRef = useRef(null);
  const { theme } = useTheme();
  const { user } = useUser();
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  const [voiceSession, setVoiceSession] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [microphone, setMicrophone] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    checkVoiceChatAvailability();
    loadWorkspaceVoicePreference();
  }, [workspace]);

  const checkVoiceChatAvailability = async () => {
    try {
      const { settings } = await System.keys();
      const voiceChatEnabled = settings?.VoiceChatEnabled === true;
      const hasAzureConfig = settings?.AzureRealtimeEndpoint && settings?.AzureRealtimeKey;
      
      setIsVoiceAvailable(voiceChatEnabled && hasAzureConfig);
      
      if (!voiceChatEnabled) {
        console.log("Voice chat is disabled in system settings");
      } else if (!hasAzureConfig) {
        console.log("Azure Realtime API not configured");
      }
    } catch (error) {
      console.error("Failed to check voice chat availability:", error);
      setIsVoiceAvailable(false);
    }
  };

  const loadWorkspaceVoicePreference = () => {
    if (!workspace) return;
    
    // Use workspace.voiceChatEnabled from database, fallback to localStorage for compatibility
    if (workspace.voiceChatEnabled !== undefined) {
      setIsVoiceEnabled(workspace.voiceChatEnabled);
    } else {
      const savedPreference = localStorage.getItem(`workspace-${workspace.slug}-voice-chat`);
      if (savedPreference !== null) {
        setIsVoiceEnabled(JSON.parse(savedPreference));
      }
    }
  };

  const saveWorkspaceVoicePreference = async (enabled) => {
    if (!workspace) return;
    
    try {
      // Update workspace in database
      await Workspace.update(workspace.slug, { voiceChatEnabled: enabled });
      
      // Also save to localStorage for immediate UI feedback
      localStorage.setItem(`workspace-${workspace.slug}-voice-chat`, JSON.stringify(enabled));
    } catch (error) {
      console.error("Failed to save workspace voice preference:", error);
      showToast("Failed to save voice chat preference", "error");
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      
      // Setup audio context for processing
      const context = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      
      setAudioContext(context);
      setMicrophone({ stream, source, processor });
      
      return true;
    } catch (error) {
      showToast("Microphone access denied. Voice chat requires microphone permissions.", "error");
      return false;
    }
  };

  const createVoiceSession = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Check microphone permission
      const hasMicPermission = await requestMicrophonePermission();
      if (!hasMicPermission) {
        setConnectionStatus('disconnected');
        return null;
      }

      const sessionId = `voice-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/api/voice-chat/${sessionId}?workspace=${workspace.slug}&userId=${user?.id || 'anonymous'}`;
      
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, 10000); // 10 second timeout

        ws.onopen = () => {
          clearTimeout(timeout);
          console.log("Voice chat WebSocket connected");
          setConnectionStatus('connected');
          
          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleVoiceMessage(data);
          };

          ws.onclose = () => {
            console.log("Voice chat WebSocket disconnected");
            setConnectionStatus('disconnected');
            setVoiceSession(null);
            setIsVoiceEnabled(false);
            stopRecording();
          };

          ws.onerror = (error) => {
            console.error("Voice chat WebSocket error:", error);
            showToast("Voice chat connection error", "error");
            setConnectionStatus('disconnected');
            setVoiceSession(null);
            setIsVoiceEnabled(false);
            stopRecording();
          };

          // Setup audio streaming
          setupAudioStreaming(ws);

          resolve(ws);
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      });
    } catch (error) {
      console.error("Failed to create voice session:", error);
      setConnectionStatus('disconnected');
      return null;
    }
  };

  const setupAudioStreaming = (ws) => {
    if (!microphone || !audioContext) return;

    const { processor, source } = microphone;
    
    processor.onaudioprocess = (event) => {
      if (!isRecording || !ws || ws.readyState !== WebSocket.OPEN) return;

      const inputBuffer = event.inputBuffer.getChannelData(0);
      
      // Convert float32 to int16 PCM
      const pcm16 = new Int16Array(inputBuffer.length);
      for (let i = 0; i < inputBuffer.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
      }
      
      // Convert to base64
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
      
      // Send audio chunk to server
      ws.send(JSON.stringify({
        type: "input_audio_buffer.append",
        audio: base64Audio
      }));
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
  };

  const startRecording = () => {
    if (!microphone || !audioContext) return;
    
    setIsRecording(true);
    audioContext.resume();
  };

  const stopRecording = () => {
    if (!microphone) return;
    
    setIsRecording(false);
    
    if (voiceSession && voiceSession.readyState === WebSocket.OPEN) {
      // Commit the audio buffer
      voiceSession.send(JSON.stringify({
        type: "input_audio_buffer.commit"
      }));
    }
    
    // Stop microphone stream
    if (microphone.stream) {
      microphone.stream.getTracks().forEach(track => track.stop());
    }
    
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
    
    setMicrophone(null);
  };

  const handleVoiceMessage = (data) => {
    switch (data.type) {
      case "connection_established":
        showToast("Voice chat connected", "success");
        startRecording(); // Start recording audio immediately
        break;
      case "session_warning":
        showToast(data.message, "warning", { autoClose: 10000 });
        break;
      case "session_timeout":
        showToast(data.message, "error");
        setIsVoiceEnabled(false);
        break;
      case "user_transcription":
        console.log("User said:", data.text);
        // The transcribed text will appear in the chat thread automatically
        // since the server saves it to WorkspaceChats
        break;
      case "audio_response_chunk":
        // Handle audio playback
        playAudioChunk(data.audio);
        break;
      case "text_response_chunk":
        console.log("Assistant response chunk:", data.text);
        break;
      case "response_complete":
        console.log("Assistant response complete:", data.text);
        // The response will appear in the chat thread automatically
        // since the server saves it to WorkspaceChats
        break;
      case "error":
        console.error("Voice chat error:", data.error);
        showToast(`Voice chat error: ${data.error.message}`, "error");
        break;
    }
  };

  const playAudioChunk = async (base64Audio) => {
    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i);
      }
      
      // Create audio context for playback if not exists
      let playbackContext = audioContext;
      if (!playbackContext || playbackContext.state === 'closed') {
        playbackContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      }
      
      // Decode and play PCM16 audio data
      const audioBuffer = playbackContext.createBuffer(1, arrayBuffer.byteLength / 2, 16000);
      const channelData = audioBuffer.getChannelData(0);
      const int16View = new Int16Array(arrayBuffer);
      
      for (let i = 0; i < int16View.length; i++) {
        channelData[i] = int16View[i] / 32768; // Convert int16 to float32
      }
      
      const source = playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackContext.destination);
      source.start(0);
      
    } catch (error) {
      console.error("Failed to play audio chunk:", error);
    }
  };

  const toggleVoiceChat = async () => {
    if (!isVoiceAvailable) {
      showToast("Voice chat is not available. Please check your configuration.", "error");
      return;
    }

    if (isVoiceEnabled) {
      // Disable voice chat
      if (voiceSession) {
        voiceSession.close();
        setVoiceSession(null);
      }
      setIsVoiceEnabled(false);
      setConnectionStatus('disconnected');
      await saveWorkspaceVoicePreference(false);
      onVoiceChatToggle(false);
      showToast("Voice chat disabled", "info");
    } else {
      // Enable voice chat
      try {
        const session = await createVoiceSession();
        if (session) {
          setVoiceSession(session);
          setIsVoiceEnabled(true);
          await saveWorkspaceVoicePreference(true);
          onVoiceChatToggle(true);
        }
      } catch (error) {
        console.error("Failed to start voice chat:", error);
        showToast("Failed to start voice chat", "error");
        setConnectionStatus('disconnected');
      }
    }
  };

  // This feature is disabled for multi-user instances where the user is not an admin
  // Same restriction as LLMSelectorAction
  if (!!user && user.role !== "admin") return null;

  // Don't show if voice chat is not available
  if (!isVoiceAvailable) return null;

  const getIconAndColor = () => {
    if (!isVoiceEnabled) {
      return {
        icon: <MicrophoneSlash className="w-[22px] h-[22px] pointer-events-none" />,
        color: "text-[var(--theme-sidebar-footer-icon-fill)]"
      };
    }

    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Microphone className="w-[22px] h-[22px] pointer-events-none" />,
          color: "text-green-400"
        };
      case 'connecting':
        return {
          icon: <WifiHigh className="w-[22px] h-[22px] pointer-events-none" />,
          color: "text-yellow-400"
        };
      default:
        return {
          icon: <WifiSlash className="w-[22px] h-[22px] pointer-events-none" />,
          color: "text-red-400"
        };
    }
  };

  const { icon, color } = getIconAndColor();

  return (
    <div
      id="voice-chat-toggle-btn"
      data-tooltip-id="tooltip-voice-chat-btn"
      aria-label="Voice Chat Toggle"
      className="border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer"
      onClick={toggleVoiceChat}
    >
      <div className={color}>
        {icon}
      </div>
      <Tooltip
        id="tooltip-voice-chat-btn"
        place="top"
        delayShow={300}
        className="tooltip !text-xs z-99"
        content={
          isVoiceEnabled 
            ? `Voice chat ${connectionStatus} - Click to disable`
            : "Click to enable voice chat"
        }
      />
    </div>
  );
}