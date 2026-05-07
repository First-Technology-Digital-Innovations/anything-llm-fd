/**
 * Safe wrapper for Application Insights that handles undefined client
 * This prevents errors when App Insights is not initialized or not available
 */
export const trackEvent = (eventName, properties = {}) => {
  try {
    if (window.appInsightsClient) {
      window.appInsightsClient.trackEvent({
        name: eventName,
        properties,
      });
    }
  } catch (error) {
    console.debug(`[AppInsights] Failed to track event "${eventName}":`, error);
  }
};

/**
 * Track an exception in Application Insights
 */
export const trackException = (error, properties = {}) => {
  try {
    if (window.appInsightsClient) {
      window.appInsightsClient.trackException({
        exception: error,
        properties,
      });
    }
  } catch (innerError) {
    console.debug("[AppInsights] Failed to track exception:", innerError);
  }
};

/**
 * Track a trace message in Application Insights
 */
export const trackTrace = (message, severityLevel = 1, properties = {}) => {
  try {
    if (window.appInsightsClient) {
      window.appInsightsClient.trackTrace({
        message,
        severityLevel,
        properties,
      });
    }
  } catch (error) {
    console.debug("[AppInsights] Failed to track trace:", error);
  }
};

/**
 * Track a page view in Application Insights
 */
export const trackPageView = (pageName, properties = {}) => {
  try {
    if (window.appInsightsClient) {
      window.appInsightsClient.trackPageView({
        name: pageName,
        properties,
      });
    }
  } catch (error) {
    console.debug("[AppInsights] Failed to track page view:", error);
  }
};

/**
 * Check if Application Insights is initialized
 */
export const isAppInsightsReady = () => {
  return !!window.appInsightsClient;
};
