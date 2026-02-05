// Voice Chat UI Component
// Provides a full-screen voice chat interface with animations and visual feedback
import React, { useState, useEffect } from 'react';
import { X, Microphone, MicrophoneSlash, Waveform } from '@phosphor-icons/react';
import { useRealtime } from '@/hooks/useRealtime';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import useUser from '@/hooks/useUser';
import { VOICE_CHAT_SAVED_EVENT } from '@/components/WorkspaceChat/ChatContainer';
import './VoiceChatMode.css';

export default function VoiceChatMode({ workspace, threadSlug = null, onClose, isVisible = false, onChatSaved = () => {} }) {
  const { user } = useUser();
  const [sessionId] = useState(() => `voice-${Date.now()}-${Math.random().toString(36).substring(2)}`);
  const [currentState, setCurrentState] = useState('idle'); // 'idle', 'listening', 'processing', 'speaking', 'error'
  const [statusMessage, setStatusMessage] = useState('Click the microphone to start');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Voice chat hooks - pass user ID for proper message attribution
  const userId = user?.id || null;
  const {
    connectionStatus,
    isReady,
    startSession,
    addUserAudio,
    inputAudioBufferClear,
    onMessage,
    disconnect
  } = useRealtime(sessionId, workspace?.slug, userId, threadSlug);

  const {
    isRecording,
    hasPermission,
    error: recorderError,
    requestPermission,
    startRecording,
    stopRecording
  } = useAudioRecorder();

  const {
    isPlaying,
    error: playerError,
    playAudioChunk,
    stopPlayback,
    clearQueue
  } = useAudioPlayer();

  // Initialize voice chat session when visible
  useEffect(() => {
    if (isVisible && !isInitialized) {
      initializeSession();
    } else if (!isVisible) {
      cleanup();
    }
  }, [isVisible]);

  // Handle messages from Realtime API
  useEffect(() => {
    if (!isReady) return;

    const unsubscribe = onMessage((message) => {
      console.log('[VoiceChatMode] Received message:', message.type);
      
      switch (message.type) {
        case 'session.created':
        case 'session_configured':
          setCurrentState('idle');
          setStatusMessage('Ready to chat - click microphone to start');
          break;
          
        case 'input_audio_buffer.speech_started':
          setCurrentState('listening');
          setStatusMessage('Listening...');
          break;
          
        case 'input_audio_buffer.speech_stopped':
          setCurrentState('processing');
          setStatusMessage('Processing...');
          break;
          
        case 'response.audio_transcript.delta':
        case 'audio_transcript_chunk':
          setCurrentState('speaking');
          setStatusMessage('AI is speaking...');
          break;
          
        case 'response.audio.delta':
          // Play audio chunk (direct Azure format)
          if (message.delta) {
            playAudioChunk(message.delta);
          }
          break;
          
        case 'audio_response_chunk':
          // Play audio chunk (server proxied format)
          if (message.audio) {
            console.log('[VoiceChatMode] Playing audio chunk, length:', message.audio.length);
            playAudioChunk(message.audio);
          }
          break;
          
        case 'response.done':
        case 'audio_response_done':
          setCurrentState('idle');
          setStatusMessage('Click microphone to continue');
          break;

        case 'chat_saved':
          // Voice chat exchange was saved to database - trigger refresh
          console.log('[VoiceChatMode] Chat saved:', message.chatId);
          // Dispatch event for ChatContainer to update history
          window.dispatchEvent(
            new CustomEvent(VOICE_CHAT_SAVED_EVENT, {
              detail: {
                chatId: message.chatId,
                prompt: message.prompt,
                response: message.response,
              },
            })
          );
          onChatSaved(message);
          break;
          
        case 'error':
          console.error('[VoiceChatMode] API error:', message.error);
          setCurrentState('error');
          setStatusMessage(`Error: ${message.error.message || 'Unknown error'}`);
          break;
          
        default:
          // Handle other message types as needed
          break;
      }
    });

    return unsubscribe;
  }, [isReady, onMessage, playAudioChunk]);

  const initializeSession = async () => {
    try {
      setCurrentState('processing');
      setStatusMessage('Connecting...');
      
      // Request microphone permission first
      await requestPermission();
      
      // Start the WebSocket session
      await startSession();
      
      setIsInitialized(true);
      setCurrentState('idle');
      setStatusMessage('Ready - click microphone to start');
      
    } catch (error) {
      console.error('[VoiceChatMode] Failed to initialize session:', error);
      setCurrentState('error');
      setStatusMessage('Failed to connect. Please try again.');
    }
  };

  const handleMicrophoneToggle = async () => {
    if (currentState === 'error') {
      // Retry initialization
      setIsInitialized(false);
      await initializeSession();
      return;
    }

    if (isRecording) {
      // Stop recording
      stopRecording();
      inputAudioBufferClear();
      setCurrentState('idle');
      setStatusMessage('Click microphone to start speaking');
    } else {
      // Start recording
      try {
        setCurrentState('listening');
        setStatusMessage('Speak now...');
        
        await startRecording((audioData) => {
          // Send audio data to Realtime API
          addUserAudio(audioData);
        });
        
      } catch (error) {
        console.error('[VoiceChatMode] Failed to start recording:', error);
        setCurrentState('error');
        setStatusMessage('Failed to start recording');
      }
    }
  };

  const cleanup = () => {
    stopRecording();
    stopPlayback();
    disconnect();
    setIsInitialized(false);
    setCurrentState('idle');
    setStatusMessage('Click the microphone to start');
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const getStateColor = () => {
    switch (currentState) {
      case 'idle': return '#10b981'; // green
      case 'listening': return '#ef4444'; // red
      case 'processing': return '#f59e0b'; // amber
      case 'speaking': return '#3b82f6'; // blue
      case 'error': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  const renderMicrophoneIcon = () => {
    switch (currentState) {
      case 'listening':
        return <Microphone className="w-16 h-16" />;
      case 'error':
        return <MicrophoneSlash className="w-16 h-16" />;
      case 'speaking':
        return <Waveform className="w-16 h-16" />;
      default:
        return <Microphone className="w-16 h-16" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="voice-chat-overlay">
      {/* Background overlay */}
      <div className="voice-chat-backdrop" onClick={handleClose} />
      
      {/* Main voice chat interface */}
      <div className="voice-chat-container">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="voice-chat-close-btn"
          aria-label="Close voice chat"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Voice chat content */}
        <div className="voice-chat-content">
          {/* Status message */}
          <div className="voice-chat-status">
            <h2 className="voice-chat-title">Voice Chat</h2>
            <p className="voice-chat-message">{statusMessage}</p>
            {connectionStatus === 'connecting' && (
              <div className="voice-chat-spinner" />
            )}
          </div>

          {/* Microphone button */}
          <div className="voice-chat-mic-container">
            {/* Animated rings for active states */}
            {(currentState === 'listening' || currentState === 'speaking') && (
              <div className="voice-chat-rings">
                <div className="voice-chat-ring ring-1" />
                <div className="voice-chat-ring ring-2" />
                <div className="voice-chat-ring ring-3" />
              </div>
            )}

            {/* Main microphone button */}
            <button
              onClick={handleMicrophoneToggle}
              className={`voice-chat-mic-button ${currentState}`}
              style={{ '--state-color': getStateColor() }}
              disabled={currentState === 'processing' || connectionStatus === 'connecting'}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {renderMicrophoneIcon()}
            </button>
          </div>

          {/* Audio visualization */}
          {currentState === 'speaking' && (
            <div className="voice-chat-audio-viz">
              {Array.from({ length: 5 }, (_, i) => (
                <div 
                  key={i} 
                  className="audio-bar" 
                  style={{ 
                    animationDelay: `${i * 0.1}s`,
                    height: `${20 + Math.random() * 60}%`
                  }} 
                />
              ))}
            </div>
          )}

          {/* Feature highlights */}
          {currentState === 'idle' && !isRecording && (
            <div className="voice-chat-features">
              <div className="feature-card">
                <div className="feature-icon">🎤</div>
                <p>Natural conversation with AI</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <p>Real-time responses</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🗣️</div>
                <p>Interrupt anytime</p>
              </div>
            </div>
          )}

          {/* Error display */}
          {(recorderError || playerError) && (
            <div className="voice-chat-error">
              <p>Error: {recorderError || playerError}</p>
              <button 
                onClick={initializeSession}
                className="retry-button"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}