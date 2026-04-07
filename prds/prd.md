# PRD: Real-Time Voice Chat for AnythingLLM-FD

## 1. Product overview

### 1.1 Document title and version

- PRD: Real-Time Voice Chat for AnythingLLM-FD
- Version: 1.1

### 1.2 Product summary

This PRD defines the implementation of real-time bidirectional voice chat functionality for a fork of AnythingLLM. The feature enables users to have natural voice conversations with an AI assistant using Azure OpenAI's GPT Realtime API for speech and audio, providing a seamless "speech in, speech out" conversational experience.

Unlike AnythingLLM's existing speech-to-text (transcribe then send) and text-to-speech (speak responses after generation) capabilities, this implementation provides true real-time voice interaction where audio streams bidirectionally through a WebSocket connection. Users speak directly to the AI and hear immediate audio responses, creating a natural conversational flow similar to a phone call.

The feature is accessed via a **Voice Chat icon** added to the workspace thread UI, positioned near the existing `llm-selector-btn`. When activated, the thread switches from the normal LLM to use the GPT Realtime API hosted in Azure. The Realtime API model connection details are stored **separately** from the normal workspace LLM configuration, allowing independent configuration of voice capabilities.

The solution consists of three main components: a WebSocket middleware server that bridges the frontend to Azure OpenAI's Realtime API, React hooks that manage audio capture/playback using Web Audio API worklets, and a sleek animated UI component that integrates with AnythingLLM's existing theme system.

### 1.3 Azure OpenAI Realtime API reference

This implementation follows the official Azure documentation:

- **How-to Guide**: [Use the GPT Realtime API for speech and audio](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/realtime-audio)
- **Quickstart**: [GPT Realtime API for speech and audio](https://learn.microsoft.com/en-us/azure/ai-services/openai/realtime-audio-quickstart)
- **WebSocket Connection**: [Use the GPT Realtime API via WebSockets](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/realtime-audio-websockets)

**Supported Models** (Global deployments in East US 2 and Sweden Central):

- `gpt-4o-realtime-preview` (2024-12-17)
- `gpt-4o-mini-realtime-preview` (2024-12-17)
- `gpt-realtime` (2025-08-28) - Recommended
- `gpt-realtime-mini` (2025-10-06)
- `gpt-realtime-mini-2025-12-15` (2025-12-15)

## 2. Goals

### 2.1 Business goals

- Differentiate the AnythingLLM fork with cutting-edge voice interaction capabilities
- Enable hands-free AI assistant usage for accessibility and convenience
- Provide a modern, premium user experience that competitors lack
- Create a foundation for voice-first AI applications and use cases

### 2.2 User goals

- Speak naturally to the AI without typing
- Receive immediate audio responses without waiting for text generation to complete
- Experience low-latency, interruption-capable conversations
- Use voice chat with any configured persona or system prompt
- Enjoy a visually appealing, intuitive voice interface

### 2.3 Non-goals

- RAG (Retrieval Augmented Generation) or document grounding integration
- Multi-language automatic detection (user selects language preference)
- Voice cloning or custom voice training
- Offline voice processing
- Mobile native app implementation (web-only for this phase)
- Conversation history persistence for voice sessions

## 3. User personas

### 3.1 Key user types

- Power users who want hands-free AI interaction while multitasking
- Accessibility users who prefer voice over keyboard input
- Developers testing voice-enabled AI applications
- Business users conducting voice-based AI consultations

### 3.2 Basic persona details

- **Multitasker Mike**: A professional who wants to interact with AI while doing other tasks, needs hands-free operation
- **Accessible Anna**: A user with mobility limitations who benefits from voice-first interfaces
- **Developer Dan**: Building voice-enabled applications and needs to test persona configurations

### 3.3 Role-based access

- **All authenticated users**: Can access voice chat functionality in workspaces where it's enabled
- **Workspace admins**: Can configure voice settings, personas, and voice model preferences
- **System admins**: Can configure Azure OpenAI Realtime API credentials and global voice settings

## 4. Functional requirements

### 4.1 Voice chat UI entry point (Priority: High)

- Add a **Voice Chat icon button** to the workspace thread UI
- Position the icon near the existing `llm-selector-btn` in the `PromptInput` component
- Icon should use Phosphor Icons (consistent with AnythingLLM) - suggest `Microphone` or `Waveform`
- Icon displays tooltip: "Switch to Voice Chat"
- Clicking the icon transitions the thread to voice chat mode
- Visual indicator shows when voice chat mode is active vs. normal text chat
- Voice chat mode replaces the text input area with the voice chat UI
- User can toggle back to text chat mode via the same icon or a close button

### 4.2 Separate Realtime API model configuration (Priority: High)

- Create new database table/model for Realtime API credentials (separate from workspace LLM settings)
- Store the following configuration independently:
  - `AZURE_OPENAI_REALTIME_ENDPOINT`: Azure OpenAI resource endpoint (e.g., `https://my-resource.openai.azure.com`)
  - `AZURE_OPENAI_REALTIME_DEPLOYMENT`: Deployment name for the realtime model
  - `AZURE_OPENAI_REALTIME_API_KEY`: API key (or use Microsoft Entra ID authentication)
- Add admin settings page for configuring Realtime API credentials
- Validate connection to Realtime API when saving credentials
- Support both API key and Microsoft Entra ID (managed identity) authentication
- Configuration is global (system-level), not per-workspace

### 4.3 WebSocket middleware server (Priority: High)

- Create a Python aiohttp-based WebSocket server (`RTMiddleTier` class)
- Establish bidirectional WebSocket connection to Azure OpenAI Realtime API
- **WebSocket URL format (GA)**: `wss://{endpoint}/openai/v1/realtime?model={deployment-name}`
- **WebSocket URL format (Preview)**: `wss://{endpoint}/openai/realtime?api-version=2025-04-01-preview&deployment={deployment-name}`
- Forward audio data from client to Azure OpenAI
- Forward audio responses from Azure OpenAI to client
- Handle session configuration (VAD settings, temperature, voice selection)
- Support dynamic system message/persona updates via REST endpoint
- Implement server-side Voice Activity Detection (VAD) configuration
- Handle connection lifecycle (open, close, reconnect, error handling)
- Support multiple concurrent voice sessions
- **Authentication options**:
  - API key via `api-key` header or query parameter
  - Microsoft Entra ID via `Authorization: Bearer {token}` header

### 4.4 React audio hooks (Priority: High)

- **useRealtime hook**: Manage WebSocket connection and message routing
  - Connect to middleware WebSocket endpoint
  - Send session.update commands with VAD configuration
  - Dispatch incoming messages to appropriate handlers
  - Provide methods: `startSession()`, `addUserAudio()`, `inputAudioBufferClear()`
- **useAudioRecorder hook**: Capture microphone audio
  - Request microphone permissions via `navigator.mediaDevices.getUserMedia`
  - Initialize AudioContext at 24kHz sample rate
  - Use AudioWorklet for low-latency audio processing
  - Convert Float32 audio to Int16 PCM format
  - Buffer audio chunks (4800 samples) before sending
  - Encode audio as Base64 for WebSocket transmission
- **useAudioPlayer hook**: Play streamed audio responses
  - Initialize AudioContext at 24kHz sample rate
  - Use AudioWorklet for seamless audio playback
  - Decode Base64 audio chunks from WebSocket
  - Convert Int16 PCM to Float32 for Web Audio API
  - Support interruption (stop playback when user speaks)

### 4.5 Audio worklets (Priority: High)

- **audio-processor-worklet.js**: Microphone input processing
  - Extend AudioWorkletProcessor class
  - Convert Float32 samples to Int16 PCM
  - Post processed audio to main thread via port.postMessage
- **audio-playback-worklet.js**: Speaker output processing
  - Extend AudioWorkletProcessor class
  - Buffer incoming Int16 audio samples
  - Convert Int16 to Float32 for playback
  - Handle buffer underrun gracefully

### 4.6 Voice chat UI component (Priority: High)

- Large circular microphone button with distinct recording/idle states
- Animated visual feedback:
  - Idle state: Subtle breathing/pulse animation, green color scheme
  - Recording state: Active pulse rings, red color scheme
  - Audio visualization bars when AI is speaking
- Status message component showing current state
- Smooth state transitions with CSS animations
- Integration with AnythingLLM's theme CSS variables
- Responsive design for desktop and tablet

### 4.7 Persona/system message support (Priority: Medium)

- REST endpoint to update system message before starting session
- Support voice selection per persona (alloy, echo, shimmer, nova, onyx, fable)
- Temperature and max token configuration
- Store persona configurations in session state

### 4.8 TypeScript types (Priority: Medium)

- `SessionUpdateCommand`: Session configuration with VAD, temperature, voice
- `InputAudioBufferAppendCommand`: Audio chunk message type
- `InputAudioBufferClearCommand`: Clear audio buffer message type
- `ResponseAudioDelta`: Incoming audio chunk from AI
- `Message`: Base message type with type discriminator

## 5. User experience

### 5.1 Entry points and first-time user flow

- Voice chat accessible via **Voice Chat icon** in the workspace thread prompt input area
- Icon is positioned near the `llm-selector-btn` for discoverability
- First-time users see tooltip explaining voice chat feature on hover
- Clicking the icon shows microphone permission prompt from browser (if not already granted)
- Clear visual transition from text chat to voice chat mode
- Voice chat UI replaces the text input area while maintaining thread context
- Optional onboarding modal explaining voice interaction on first use

### 5.2 Core experience

- **Starting conversation**: User taps large microphone button, button transitions to red recording state with pulsing animation
- **Speaking**: User speaks naturally while button shows active recording visualization
- **AI listening**: Server VAD detects speech boundaries automatically
- **AI responding**: Audio plays immediately through speakers, visualization shows activity
- **Interruption**: User can speak to interrupt AI response, playback stops automatically
- **Ending conversation**: User taps button again to stop, button returns to green idle state

### 5.3 Advanced features and edge cases

- Automatic reconnection on WebSocket disconnect
- Graceful degradation if microphone permission denied
- Clear error messages for connection failures
- Session timeout handling after prolonged inactivity
- Browser compatibility checks for AudioWorklet support

### 5.4 UI/UX highlights

- Large, touch-friendly microphone button (192x192px minimum on desktop)
- Gradient backgrounds that complement AnythingLLM's dark theme
- Floating particle animations for visual interest
- Smooth 60fps CSS animations for state transitions
- Audio visualization bars showing speech activity
- Feature cards explaining capabilities when idle
- Accessible ARIA labels and keyboard navigation

## 6. Narrative

A user opens their AnythingLLM workspace and starts chatting in a thread. They notice a small microphone icon near the LLM selector button. Curious, they hover over it and see "Switch to Voice Chat." Clicking the icon, the text input area smoothly transforms into a sleek voice interface with a large green microphone button pulsing gently.

The browser prompts for microphone access, which they grant. Tapping the microphone button, it smoothly transitions to red as concentric rings begin pulsing outward. The user speaks their question naturally, and within moments, they hear the AI's voice respond directly through their speakers—the thread has seamlessly switched to using Azure's GPT Realtime API.

If they want to ask a follow-up, they simply start speaking—the AI's response stops immediately, and their new question is processed. When finished, a tap returns the interface to its serene idle state. To return to text chat, they click the close button or the voice icon again, and the familiar text input reappears. The entire experience feels like a natural conversation rather than interacting with a computer.

## 7. Success metrics

### 7.1 User-centric metrics

- Voice session initiation rate (users who start voice chat vs. total users)
- Average voice session duration
- Interruption rate (indicates natural conversational flow)
- Microphone permission grant rate

### 7.2 Business metrics

- Feature adoption percentage among active users
- User retention impact (voice users vs. non-voice users)
- Support ticket reduction for accessibility needs

### 7.3 Technical metrics

- Audio round-trip latency (target: <500ms)
- WebSocket connection success rate (target: >99%)
- Audio quality score (no dropped frames, consistent sample rate)
- Concurrent session capacity

## 8. Technical considerations

### 8.1 Integration points

- **Azure OpenAI Realtime API**: Primary AI backend for voice chat
  - WebSocket endpoint: `wss://{endpoint}/openai/v1/realtime?model={deployment}`
  - Supports `gpt-4o-realtime-preview`, `gpt-4o-mini-realtime-preview`, `gpt-realtime`, `gpt-realtime-mini`
  - Requires separate configuration from normal LLM settings
- **AnythingLLM authentication**: Leverage existing auth system for voice endpoint access
- **AnythingLLM theme system**: Use CSS variables (`--theme-*`) for consistent styling
- **AnythingLLM workspace context**: Voice chat operates within workspace thread scope
- **AnythingLLM PromptInput component**: Voice Chat icon integrates near `llm-selector-btn`
- **AnythingLLM System model**: New fields for Realtime API configuration (separate from LLM config)

### 8.2 Data storage and privacy

- No audio data persisted on server (streaming only)
- System messages/personas stored in session memory only
- Audio processed in real-time, not cached
- Comply with browser microphone permission policies
- Clear indication to users when microphone is active

### 8.3 Scalability and performance

- WebSocket middleware handles multiple concurrent connections
- Audio worklets run in separate thread for low latency
- 24kHz sample rate optimized for speech
- Chunked audio transmission (4800 sample buffers ≈ 200ms)
- Connection pooling for Azure OpenAI API

### 8.4 Potential challenges

- Browser compatibility for AudioWorklet (Safari, older browsers)
- Microphone permission UX varies by browser
- Network latency affecting conversational flow
- Echo cancellation when not using headphones
- Mobile browser background audio restrictions

## 9. Milestones and sequencing

### 9.1 Project estimate

- Medium-Large: 5-7 weeks for full implementation

### 9.2 Team size and composition

- 2-3 developers: 1 backend (Python/WebSocket), 1-2 frontend (React/Audio)
- 1 designer (optional): UI polish and animations

### 9.3 Suggested phases

- **Phase 1: Admin Configuration & Database** (1 week)
  - Database schema for Realtime API credentials (separate from LLM config)
  - Admin settings UI for Realtime API configuration
  - Connection validation endpoint
  - Environment variable support

- **Phase 2: Backend WebSocket Middleware** (1-2 weeks)
  - RTMiddleTier class implementation
  - Azure OpenAI Realtime API WebSocket integration
  - Session management and system message endpoints
  - Support for GA and Preview API versions
  - Basic connection testing

- **Phase 3: React Audio Hooks** (1-2 weeks)
  - useRealtime hook with WebSocket management
  - useAudioRecorder hook with worklet
  - useAudioPlayer hook with worklet
  - Audio worklet JavaScript files
  - TypeScript type definitions

- **Phase 4: Voice Chat UI Component** (1 week)
  - Voice chat component with microphone button
  - CSS animations and transitions
  - Theme integration with AnythingLLM variables
  - Status message component

- **Phase 5: Workspace Thread Integration** (1 week)
  - Voice Chat icon in PromptInput near `llm-selector-btn`
  - Mode switching between text and voice chat
  - Thread context preservation
  - Error handling and edge cases
  - Browser compatibility testing

## 10. User stories

### 10.1 Access voice chat from workspace thread

- **ID**: GH-001
- **Description**: As a user in a workspace thread, I want to click a Voice Chat icon near the LLM selector so that I can switch to voice-based conversation.
- **Acceptance criteria**:
  - Voice Chat icon is visible in the PromptInput component near `llm-selector-btn`
  - Icon uses consistent Phosphor Icons styling (e.g., `Microphone` or `Waveform`)
  - Tooltip displays "Switch to Voice Chat" on hover
  - Clicking the icon transitions the prompt area to voice chat UI
  - Text input area is replaced by voice chat interface
  - Thread context is maintained when switching modes

### 10.2 Configure Realtime API credentials (Admin)

- **ID**: GH-002
- **Description**: As a system admin, I want to configure Azure OpenAI Realtime API credentials separately from normal LLM settings so that voice chat has independent configuration.
- **Acceptance criteria**:
  - New admin settings section for "Voice Chat / Realtime API"
  - Fields for: Endpoint URL, Deployment Name, API Key (or Entra ID option)
  - Credentials stored separately from workspace LLM configuration
  - Connection validation when saving (test WebSocket connection)
  - Clear error messages if validation fails
  - Support for both API key and Microsoft Entra ID authentication

### 10.3 Start voice conversation

- **ID**: GH-003
- **Description**: As a user, I want to start a voice conversation by clicking a microphone button so that I can speak to the AI hands-free.
- **Acceptance criteria**:
  - Large microphone button is prominently displayed in voice chat mode
  - Clicking button requests microphone permission if not already granted
  - Button transitions from green/idle to red/recording state with animation
  - WebSocket connection is established to backend middleware using Realtime API config
  - Session is configured with VAD settings automatically

### 10.4 Speak and be heard

- **ID**: GH-004
- **Description**: As a user, I want to speak into my microphone and have my audio sent to the AI so that I can communicate naturally.
- **Acceptance criteria**:
  - Microphone audio is captured at 24kHz sample rate
  - Audio is converted to PCM Int16 format
  - Audio chunks are Base64 encoded and sent via WebSocket
  - Visual feedback indicates audio is being captured
  - Server VAD detects speech start and end boundaries

### 10.5 Hear AI responses

- **ID**: GH-005
- **Description**: As a user, I want to hear the AI's voice response through my speakers so that I can have a natural conversation.
- **Acceptance criteria**:
  - Audio response chunks arrive via WebSocket
  - Audio is decoded from Base64 and played immediately
  - Playback is seamless without gaps between chunks
  - Audio visualization shows AI is speaking
  - Playback uses system default audio output

### 10.6 Interrupt AI response

- **ID**: GH-006
- **Description**: As a user, I want to interrupt the AI by speaking so that I can redirect the conversation naturally.
- **Acceptance criteria**:
  - Server detects user speech start via VAD
  - AI audio playback stops immediately when user speaks
  - Audio buffer is cleared to prevent delayed playback
  - User's new speech is processed without delay
  - No audio overlap between user and AI

### 10.7 Stop voice conversation

- **ID**: GH-007
- **Description**: As a user, I want to stop the voice conversation by clicking the microphone button so that I can end the session cleanly.
- **Acceptance criteria**:
  - Clicking red recording button stops audio capture
  - Audio playback stops if AI was speaking
  - Button transitions back to green/idle state with animation
  - WebSocket connection is maintained for quick restart
  - Status message indicates session ended

### 10.8 Configure persona

- **ID**: GH-008
- **Description**: As a workspace admin, I want to configure the AI persona and voice so that voice chat matches my brand or use case.
- **Acceptance criteria**:
  - System message can be configured via settings or API
  - Voice can be selected from available options (alloy, echo, shimmer, nova, onyx, fable)
  - Temperature and response length can be adjusted
  - Settings persist for workspace/session
  - Changes take effect on next session start

### 10.9 Handle connection errors

- **ID**: GH-009
- **Description**: As a user, I want to see clear error messages when connection issues occur so that I understand what went wrong.
- **Acceptance criteria**:
  - Connection failure shows user-friendly error message
  - Automatic reconnection is attempted for transient failures
  - Microphone permission denial shows specific guidance
  - Network timeout shows appropriate message
  - UI returns to safe idle state after errors

### 10.10 View voice chat status

- **ID**: GH-010
- **Description**: As a user, I want to see the current status of the voice chat so that I know what's happening.
- **Acceptance criteria**:
  - Idle state shows "Click to start conversation" message
  - Recording state shows "Listening..." with audio visualization
  - AI speaking state shows audio level bars
  - Processing state shows appropriate indicator
  - Status transitions smoothly without jarring changes

### 10.11 WebSocket middleware session management

- **ID**: GH-011
- **Description**: As a backend developer, I want the middleware to manage Azure OpenAI Realtime API sessions so that the frontend has a simple interface.
- **Acceptance criteria**:
  - Middleware connects to Azure OpenAI Realtime API on client connection
  - Session configuration is forwarded to Azure API
  - Audio messages are relayed bidirectionally
  - Connection lifecycle events are handled (open, close, error)
  - Multiple concurrent sessions are supported

### 10.12 Audio worklet implementation

- **ID**: GH-012
- **Description**: As a frontend developer, I want AudioWorklet processors for recording and playback so that audio processing is low-latency.
- **Acceptance criteria**:
  - audio-processor-worklet.js captures microphone input
  - Float32 audio is converted to Int16 PCM
  - audio-playback-worklet.js plays received audio
  - Int16 PCM is converted to Float32 for Web Audio API
  - Worklets run in separate thread for performance

### 10.13 Responsive voice chat UI

- **ID**: GH-013
- **Description**: As a user on different devices, I want the voice chat UI to be responsive so that I can use it on desktop and tablet.
- **Acceptance criteria**:
  - Microphone button scales appropriately (64x64 mobile, 192x192 desktop)
  - Animations perform at 60fps on target devices
  - Touch targets meet accessibility guidelines (44x44 minimum)
  - Layout adapts to viewport width
  - Feature cards stack vertically on narrow screens

### 10.14 Theme integration

- **ID**: GH-014
- **Description**: As an AnythingLLM user, I want voice chat to match the app's theme so that the experience is consistent.
- **Acceptance criteria**:
  - UI uses AnythingLLM CSS variables for colors
  - Dark theme is fully supported
  - Custom branding colors can be applied
  - Animations complement existing UI patterns
  - Fonts match AnythingLLM typography

### 10.15 Return to text chat

- **ID**: GH-015
- **Description**: As a user, I want to return to text chat mode from voice chat so that I can switch between interaction modes.
- **Acceptance criteria**:
  - Close button or voice chat icon allows returning to text mode
  - Voice chat session is cleanly terminated
  - Text input area is restored
  - Thread context and history are preserved
  - Smooth transition animation between modes

---

## Appendix A: Technical reference

### WebSocket message types

```typescript
// Session configuration
type SessionUpdateCommand = {
  type: "session.update";
  session: {
    turn_detection: {
      type: "server_vad";
      threshold: number; // 0.0 - 1.0
      silence_duration_ms: number;
      prefix_padding_ms: number;
    };
    temperature: number;
    max_response_output_tokens: number;
    voice?: "alloy" | "echo" | "shimmer" | "nova" | "onyx" | "fable";
  };
};

// Send audio to server
type InputAudioBufferAppendCommand = {
  type: "input_audio_buffer.append";
  audio: string; // Base64 encoded PCM
};

// Clear audio buffer
type InputAudioBufferClearCommand = {
  type: "input_audio_buffer.clear";
};

// Receive audio from server
type ResponseAudioDelta = {
  type: "response.audio.delta";
  delta: string; // Base64 encoded PCM
};
```

### Audio specifications

- Sample rate: 24,000 Hz
- Format: PCM Int16 (signed 16-bit little-endian)
- Channels: Mono
- Chunk size: 4,800 samples (200ms)
- Encoding: Base64 for WebSocket transmission

### CSS animation keyframes reference

```css
@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.5;
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes audio-bar {
  0%,
  100% {
    height: 20%;
  }
  50% {
    height: 100%;
  }
}
```

### Backend environment variables

**Realtime API Configuration (stored separately from normal LLM config)**:

```
# Required - Azure OpenAI Resource
AZURE_OPENAI_REALTIME_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-realtime  # or gpt-4o-realtime-preview, etc.

# Authentication (choose one)
AZURE_OPENAI_REALTIME_API_KEY=<api-key>
# OR use Microsoft Entra ID (managed identity) - no key required

# Optional - Session defaults
AZURE_OPENAI_REALTIME_VOICE=alloy  # alloy, echo, shimmer, nova, onyx, fable
AZURE_OPENAI_REALTIME_TEMPERATURE=0.8
```

### WebSocket connection URL formats

```
# GA version (recommended) - no api-version parameter
wss://my-resource.openai.azure.com/openai/v1/realtime?model=gpt-realtime-deployment

# Preview version - requires api-version parameter
wss://my-resource.openai.azure.com/openai/realtime?api-version=2025-04-01-preview&deployment=gpt-realtime-deployment
```

### Session configuration example

```json
{
  "type": "session.update",
  "session": {
    "voice": "alloy",
    "instructions": "You are a helpful assistant.",
    "input_audio_format": "pcm16",
    "input_audio_transcription": {
      "model": "whisper-1"
    },
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "prefix_padding_ms": 300,
      "silence_duration_ms": 200,
      "create_response": true
    },
    "tools": []
  }
}
```
