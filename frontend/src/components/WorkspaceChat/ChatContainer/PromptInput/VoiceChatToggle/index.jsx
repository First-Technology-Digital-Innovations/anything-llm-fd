import { Tooltip } from "react-tooltip";
import { Microphone } from "@phosphor-icons/react";
import { useTheme } from "@/hooks/useTheme";
import { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import useUser from "@/hooks/useUser";
import System from "@/models/system";
import showToast from "@/utils/toast";
import VoiceChatMode from "@/components/VoiceChatMode";

export default function VoiceChatToggleAction({
  workspace,
  onVoiceChatToggle = () => {},
  onChatSaved = () => {},
}) {
  const tooltipRef = useRef(null);
  const { theme } = useTheme();
  const { user } = useUser();
  const { threadSlug = null } = useParams();
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [showVoiceChatMode, setShowVoiceChatMode] = useState(false);

  useEffect(() => {
    checkVoiceChatAvailability();
  }, [workspace]);

  const checkVoiceChatAvailability = async () => {
    try {
      const settings = await System.keys();
      const voiceChatEnabled = settings?.VoiceChatEnabled === true;
      const hasAzureConfig =
        settings?.AzureRealtimeEndpoint && settings?.AzureRealtimeKey;

      console.log("Voice Chat Debug:", {
        voiceChatEnabled,
        hasAzureConfig,
        azureEndpoint: settings?.AzureRealtimeEndpoint,
        hasAzureKey: !!settings?.AzureRealtimeKey,
      });

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

  const toggleVoiceChat = () => {
    if (!isVoiceAvailable) {
      showToast(
        "Voice chat is not available. Please check your configuration.",
        "error"
      );
      return;
    }

    setShowVoiceChatMode(!showVoiceChatMode);
    onVoiceChatToggle(!showVoiceChatMode);
  };

  const handleVoiceChatClose = () => {
    setShowVoiceChatMode(false);
    onVoiceChatToggle(false);
  };

  // Don't show if voice chat is not available
  if (!isVoiceAvailable) return null;

  return (
    <>
      <div
        id="voice-chat-toggle-btn"
        data-tooltip-id="tooltip-voice-chat-btn"
        aria-label="Voice Chat Toggle"
        className="border-none relative flex justify-center items-center opacity-60 hover:opacity-100 light:opacity-100 light:hover:opacity-60 cursor-pointer"
        onClick={toggleVoiceChat}
      >
        <div className="text-[var(--theme-sidebar-footer-icon-fill)]">
          <Microphone className="w-[22px] h-[22px] pointer-events-none" />
        </div>
        <Tooltip
          id="tooltip-voice-chat-btn"
          place="top"
          delayShow={300}
          className="tooltip !text-xs z-99"
          content="Click to start voice chat"
        />
      </div>

      <VoiceChatMode
        workspace={workspace}
        threadSlug={threadSlug}
        isVisible={showVoiceChatMode}
        onClose={handleVoiceChatClose}
        onChatSaved={onChatSaved}
      />
    </>
  );
}
