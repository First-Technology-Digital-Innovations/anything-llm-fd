import React, { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import Sidebar from "@/components/SettingsSidebar";
import System from "@/models/system";
import Admin from "@/models/admin";
import PreLoader from "@/components/Preloader";
import showToast from "@/utils/toast";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export default function VoiceChatSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    VoiceChatEnabled: false,
    AzureRealtimeEndpoint: "",
    AzureRealtimeKey: "",
    AzureRealtimeModel: "gpt-realtime",
    VoiceChatDefaultVoice: "alloy",
    VoiceChatVADThreshold: 0.5,
    VoiceChatSessionTimeout: 1500000, // 25 minutes
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const _settings = await System.keys();
        setSettings(_settings);

        // Populate form with current settings
        setFormData({
          VoiceChatEnabled: _settings?.VoiceChatEnabled || false,
          AzureRealtimeEndpoint: _settings?.AzureRealtimeEndpoint || "",
          AzureRealtimeKey: _settings?.AzureRealtimeKey || "",
          AzureRealtimeModel: _settings?.AzureRealtimeModel || "gpt-realtime",
          VoiceChatDefaultVoice: _settings?.VoiceChatDefaultVoice || "alloy",
          VoiceChatVADThreshold: _settings?.VoiceChatVADThreshold || 0.5,
          VoiceChatSessionTimeout:
            _settings?.VoiceChatSessionTimeout || 1500000,
        });

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch voice chat settings:", error);
        showToast("Failed to load voice chat settings", "error");
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const validateForm = () => {
    if (formData.VoiceChatEnabled) {
      if (!formData.AzureRealtimeEndpoint) {
        showToast(
          "Azure Realtime Endpoint is required when voice chat is enabled",
          "error"
        );
        return false;
      }
      if (!formData.AzureRealtimeKey) {
        showToast(
          "Azure Realtime API Key is required when voice chat is enabled",
          "error"
        );
        return false;
      }
      if (!formData.AzureRealtimeModel) {
        showToast(
          "Azure Realtime Model is required when voice chat is enabled",
          "error"
        );
        return false;
      }
    }
    return true;
  };

  const testConnection = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const testSettings = {
        VoiceChatEnabled: formData.VoiceChatEnabled,
        AzureRealtimeEndpoint: formData.AzureRealtimeEndpoint,
        AzureRealtimeKey: formData.AzureRealtimeKey,
        AzureRealtimeModel: formData.AzureRealtimeModel,
      };

      const result = await Admin.updateSystemPreferences(testSettings);
      if (result?.success === false) {
        showToast(
          `Connection test failed: ${result?.error ?? "unknown error"}`,
          "error"
        );
      } else {
        showToast("Connection test successful!", "success");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      showToast("Connection test failed. Please check your settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const updateData = {
        VoiceChatEnabled: formData.VoiceChatEnabled,
        AzureRealtimeEndpoint: formData.AzureRealtimeEndpoint,
        AzureRealtimeKey: formData.AzureRealtimeKey,
        AzureRealtimeModel: formData.AzureRealtimeModel,
        VoiceChatDefaultVoice: formData.VoiceChatDefaultVoice,
        VoiceChatVADThreshold: formData.VoiceChatVADThreshold,
        VoiceChatSessionTimeout: formData.VoiceChatSessionTimeout,
      };

      const result = await Admin.updateSystemPreferences(updateData);
      if (result?.success === false) {
        showToast(
          `Failed to save settings: ${result?.error ?? "unknown error"}`,
          "error"
        );
      } else {
        showToast("Voice chat settings saved successfully", "success");
        setHasChanges(false);

        const _settings = await System.keys();
        setSettings(_settings);
      }
    } catch (error) {
      console.error("Failed to save voice chat settings:", error);
      showToast("Failed to save voice chat settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
        <Sidebar />
        <div
          style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
          className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
        >
          <div className="w-full h-full flex justify-center items-center">
            <PreLoader />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-4">
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white border-b-2 border-opacity-10">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                Voice Chat Settings
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              Configure Azure OpenAI Realtime API settings for voice chat
              functionality.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-y-6">
            {/* Enable Voice Chat */}
            <div className="flex flex-col gap-y-2">
              <label className="text-theme-text-primary text-sm font-semibold block">
                Enable Voice Chat
              </label>
              <div className="flex items-center gap-x-2">
                <input
                  type="checkbox"
                  id="voice-chat-enabled"
                  checked={formData.VoiceChatEnabled}
                  onChange={(e) =>
                    handleInputChange("VoiceChatEnabled", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-theme-border bg-theme-bg-secondary"
                />
                <label
                  htmlFor="voice-chat-enabled"
                  className="text-theme-text-secondary text-sm"
                >
                  Enable real-time voice chat functionality
                </label>
              </div>
            </div>

            {/* Azure Realtime Endpoint */}
            <div className="flex flex-col gap-y-2">
              <label className="text-theme-text-primary text-sm font-semibold block">
                Azure Realtime Endpoint <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                placeholder="https://your-resource.cognitiveservices.azure.com"
                value={formData.AzureRealtimeEndpoint}
                onChange={(e) =>
                  handleInputChange("AzureRealtimeEndpoint", e.target.value)
                }
                className="bg-theme-bg-secondary border-theme-border border rounded-lg px-4 py-2 text-theme-text-primary placeholder:text-theme-text-placeholder focus:border-theme-accent outline-none"
                required={formData.VoiceChatEnabled}
              />
              <p className="text-xs text-theme-text-secondary">
                Your Azure OpenAI resource endpoint URL (without /openai path)
              </p>
            </div>

            {/* Azure Realtime API Key */}
            <div className="flex flex-col gap-y-2">
              <label className="text-theme-text-primary text-sm font-semibold block">
                Azure Realtime API Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="Your Azure OpenAI API key"
                  value={formData.AzureRealtimeKey}
                  onChange={(e) =>
                    handleInputChange("AzureRealtimeKey", e.target.value)
                  }
                  className="bg-theme-bg-secondary border-theme-border border rounded-lg px-4 py-2 pr-10 text-theme-text-primary placeholder:text-theme-text-placeholder focus:border-theme-accent outline-none w-full"
                  required={formData.VoiceChatEnabled}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-theme-text-secondary hover:text-theme-text-primary"
                >
                  {showApiKey ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-theme-text-secondary">
                API key for your Azure OpenAI resource with Realtime API access
              </p>
            </div>

            {/* Azure Realtime Model */}
            <div className="flex flex-col gap-y-2">
              <label className="text-theme-text-primary text-sm font-semibold block">
                Azure Realtime Model <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.AzureRealtimeModel}
                onChange={(e) =>
                  handleInputChange("AzureRealtimeModel", e.target.value)
                }
                className="bg-theme-bg-secondary border-theme-border border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-accent outline-none"
                required={formData.VoiceChatEnabled}
              >
                <option value="gpt-realtime">gpt-realtime (Recommended)</option>
                <option value="gpt-realtime-mini">gpt-realtime-mini</option>
                <option value="gpt-4o-realtime-preview">
                  gpt-4o-realtime-preview
                </option>
                <option value="gpt-4o-mini-realtime-preview">
                  gpt-4o-mini-realtime-preview
                </option>
              </select>
              <p className="text-xs text-theme-text-secondary">
                The deployment name for your Azure Realtime model
              </p>
            </div>

            {/* Default Voice */}
            <div className="flex flex-col gap-y-2">
              <label className="text-theme-text-primary text-sm font-semibold block">
                Default Voice
              </label>
              <select
                value={formData.VoiceChatDefaultVoice}
                onChange={(e) =>
                  handleInputChange("VoiceChatDefaultVoice", e.target.value)
                }
                className="bg-theme-bg-secondary border-theme-border border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-accent outline-none"
              >
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="shimmer">Shimmer</option>
                <option value="nova">Nova</option>
                <option value="onyx">Onyx</option>
                <option value="fable">Fable</option>
              </select>
              <p className="text-xs text-theme-text-secondary">
                Default voice for AI responses in voice chat
              </p>
            </div>

            {/* VAD Threshold */}
            <div className="flex flex-col gap-y-2">
              <label className="text-theme-text-primary text-sm font-semibold block">
                Voice Activity Detection Threshold
              </label>
              <div className="flex items-center gap-x-4">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={formData.VoiceChatVADThreshold}
                  onChange={(e) =>
                    handleInputChange(
                      "VoiceChatVADThreshold",
                      parseFloat(e.target.value)
                    )
                  }
                  className="flex-1"
                />
                <span className="text-theme-text-secondary text-sm min-w-[3rem]">
                  {formData.VoiceChatVADThreshold}
                </span>
              </div>
              <p className="text-xs text-theme-text-secondary">
                Sensitivity for detecting when user starts/stops speaking (0.1 =
                very sensitive, 1.0 = less sensitive)
              </p>
            </div>

            {/* Session Timeout */}
            <div className="flex flex-col gap-y-2">
              <label className="text-theme-text-primary text-sm font-semibold block">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={Math.round(formData.VoiceChatSessionTimeout / 60000)}
                onChange={(e) =>
                  handleInputChange(
                    "VoiceChatSessionTimeout",
                    parseInt(e.target.value) * 60000
                  )
                }
                className="bg-theme-bg-secondary border-theme-border border rounded-lg px-4 py-2 text-theme-text-primary placeholder:text-theme-text-placeholder focus:border-theme-accent outline-none w-32"
              />
              <p className="text-xs text-theme-text-secondary">
                How long voice chat sessions remain active (1-60 minutes)
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-x-4 pt-6">
              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="bg-theme-accent hover:bg-theme-accent-hover text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>

              {formData.VoiceChatEnabled &&
                formData.AzureRealtimeEndpoint &&
                formData.AzureRealtimeKey && (
                  <button
                    type="button"
                    onClick={testConnection}
                    disabled={saving}
                    className="bg-theme-bg-secondary hover:bg-theme-bg-tertiary border border-theme-border text-theme-text-primary font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? "Testing..." : "Test Connection"}
                  </button>
                )}
            </div>

            {/* Help text */}
            <div className="bg-theme-bg-tertiary border border-theme-border rounded-lg p-4 mt-6">
              <h3 className="text-theme-text-primary font-semibold mb-2">
                Setup Instructions:
              </h3>
              <ol className="text-theme-text-secondary text-sm space-y-1 list-decimal list-inside">
                <li>
                  Create an Azure OpenAI resource in East US 2 or Sweden Central
                  regions
                </li>
                <li>
                  Deploy one of the supported Realtime models (gpt-realtime
                  recommended)
                </li>
                <li>
                  Get your resource endpoint and API key from the Azure portal
                </li>
                <li>Enter the credentials above and test the connection</li>
                <li>Enable voice chat and save settings</li>
              </ol>
              <p className="text-xs text-theme-text-secondary mt-2">
                <strong>Note:</strong> Voice chat requires a compatible browser
                with AudioWorklet support (Chrome 66+, Firefox 76+, Safari
                14.1+)
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
