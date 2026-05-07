import { useEffect } from "react";
import { baseHeaders } from "@/utils/request";
import { API_BASE } from "@/utils/constants";

/**
 * Initializes Application Insights after user authentication
 * This component should be placed inside the AuthProvider
 */
export default function AppInsightsInitializer() {
  useEffect(() => {
    const initializeAppInsights = async () => {
      // Skip if already initialized
      if (window.appInsightsClient) {
        return;
      }

      try {
        // Fetch from authenticated endpoint
        const response = await fetch(`${API_BASE}/system/app-insights-config`, {
          headers: baseHeaders(),
        });

        if (!response.ok) {
          console.debug(
            "[AppInsights] Failed to fetch config:",
            response.statusText
          );
          return;
        }

        const data = await response.json();
        const connectionString = data?.connectionString;

        if (!connectionString) {
          console.debug("[AppInsights] No connection string configured");
          return;
        }

        // Dynamically import and initialize Application Insights
        const { ApplicationInsights } = await import(
          "@microsoft/applicationinsights-web"
        );
        const appInsights = new ApplicationInsights({
          config: {
            connectionString,
            enableAutoRouteTracking: true,
            enableUnhandledPromiseRejectionTracking: true,
          },
        });

        appInsights.loadAppInsights();
        window.appInsightsClient = appInsights;
        console.log(
          "[AppInsights] Application Insights initialized from authenticated endpoint"
        );
      } catch (error) {
        console.debug("[AppInsights] Failed to initialize:", error.message);
      }
    };

    initializeAppInsights();
  }, []);

  // This component doesn't render anything
  return null;
}
