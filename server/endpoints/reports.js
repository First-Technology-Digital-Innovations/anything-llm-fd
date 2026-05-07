const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const AzureInsightsClient = require("../utils/azureInsightsClient");

function reportEndpoints(app) {
  if (!app) return;

  const insightsConnectionString = process.env.APP_INSIGHTS_CONNECTION_STRING;
  const insightsKey = process.env.APP_INSIGHTS_API_KEY;
  
  console.log("[Reports] Connection String exists:", !!insightsConnectionString);
  console.log("[Reports] API Key exists:", !!insightsKey);
  
  if (!insightsConnectionString || !insightsKey) {
    console.warn(
      "APP_INSIGHTS_CONNECTION_STRING or APP_INSIGHTS_API_KEY not configured. Report endpoints will return empty data."
    );
  }

  /**
   * GET /reports/usage/prompt-volume
   * Returns daily count of prompts sent across workspaces
   */
  app.get(
    "/reports/usage/prompt-volume",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { startDate, endDate, workspaceId } = request.query;

        if (!startDate || !endDate) {
          return response.status(400).json({
            success: false,
            error: "startDate and endDate query parameters are required",
          });
        }

        // Validate dates
        const start = AzureInsightsClient.parseDate(startDate);
        const end = AzureInsightsClient.parseDate(endDate);

        if (start >= end) {
          return response.status(400).json({
            success: false,
            error: "startDate must be before endDate",
          });
        }

        if (!insightsConnectionString || !insightsKey) {
          return response.json({
            success: true,
            data: [],
            warning: "App Insights not configured",
          });
        }

        const client = new AzureInsightsClient(insightsConnectionString, insightsKey);

        // KQL query for daily prompt volume
        let kql = `customEvents
          | where name == 'WorkspaceChat_Created'
          | where timestamp >= datetime('${start.toISOString()}') and timestamp <= datetime('${end.toISOString()}')`;
        
        if (workspaceId) {
          kql += `\n          | where tostring(customDimensions["workspaceId"]) == '${workspaceId}'`;
        }
        
        kql += `\n          | summarize count() by bin(timestamp, 1d)
          | order by timestamp asc`;

        console.log("Executing KQL query for prompt volume:", kql);

        const results = await client.executeQuery(kql, { limit: 1000 });

        // Rename columns for consistency
        const data = results.map((row) => ({
          timestamp: row.timestamp,
          count: row.count_ || 0,
        }));

        response.json({
          success: true,
          data,
          query: "prompt_volume_daily",
        });
      } catch (error) {
        console.error("Error fetching prompt volume:", error.message);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /reports/usage/source-coverage
   * Returns average references per response and % of responses with sources
   */
  app.get(
    "/reports/usage/source-coverage",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { startDate, endDate, workspaceId } = request.query;

        if (!startDate || !endDate) {
          return response.status(400).json({
            success: false,
            error: "startDate and endDate query parameters are required",
          });
        }

        const start = AzureInsightsClient.parseDate(startDate);
        const end = AzureInsightsClient.parseDate(endDate);

        if (start >= end) {
          return response.status(400).json({
            success: false,
            error: "startDate must be before endDate",
          });
        }

        if (!insightsConnectionString) {
          return response.json({
            success: true,
            data: { avgSources: 0, percentWithSources: 0 },
            warning: "App Insights not configured",
          });
        }

        const client = new AzureInsightsClient(insightsConnectionString, insightsKey);

        // KQL query for source coverage metrics
        let kql = `customEvents
          | where name == "WorkspaceChat_BotResponse"
          | where timestamp >= datetime('${start.toISOString()}') and timestamp <= datetime('${end.toISOString()}')`;
        
        if (workspaceId) {
          kql += `\n          | where tostring(customDimensions["workspaceId"]) == '${workspaceId}'`;
        }
        
        kql += `\n          | extend sourcesUsed = toint(customDimensions["sourcesUsed"])
          | where isnotnull(sourcesUsed)
          | summarize avg(sourcesUsed), pct_with_sources = countif(sourcesUsed > 0) * 100.0 / count()`;

        const results = await client.executeQuery(kql);

        const data =
          results.length > 0
            ? {
                avgSources: Math.round(results[0].avg_sourcesUsed * 100) / 100,
                percentWithSources:
                  Math.round(results[0].pct_with_sources * 100) / 100,
              }
            : { avgSources: 0, percentWithSources: 0 };

        response.json({
          success: true,
          data,
          query: "source_coverage",
        });
      } catch (error) {
        console.error("Error fetching source coverage:", error.message);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /reports/usage/output-volume
   * Returns daily average token count and total tokens output
   */
  app.get(
    "/reports/usage/output-volume",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { startDate, endDate, workspaceId } = request.query;

        if (!startDate || !endDate) {
          return response.status(400).json({
            success: false,
            error: "startDate and endDate query parameters are required",
          });
        }

        const start = AzureInsightsClient.parseDate(startDate);
        const end = AzureInsightsClient.parseDate(endDate);

        if (start >= end) {
          return response.status(400).json({
            success: false,
            error: "startDate must be before endDate",
          });
        }

        if (!insightsConnectionString) {
          return response.json({
            success: true,
            data: [],
            warning: "App Insights not configured",
          });
        }

        const client = new AzureInsightsClient(insightsConnectionString, insightsKey);

        // KQL query for output volume
        let kql = `customEvents
          | where name == "WorkspaceChat_BotResponse"
          | where timestamp >= datetime('${start.toISOString()}') and timestamp <= datetime('${end.toISOString()}')`;
        
        if (workspaceId) {
          kql += `\n          | where tostring(customDimensions["workspaceId"]) == '${workspaceId}'`;
        }
        
        kql += `\n          | extend tokenCount = toint(customDimensions["responseTokens"])
          | summarize avg(tokenCount), sum(tokenCount) by bin(timestamp, 1d)
          | order by timestamp asc`;

        const results = await client.executeQuery(kql, { limit: 1000 });

        const data = results.map((row) => ({
          timestamp: row.timestamp,
          avgTokens: Math.round(row.avg_tokenCount || 0),
          totalTokens: row.sum_tokenCount || 0,
        }));

        response.json({
          success: true,
          data,
          query: "output_volume_daily",
        });
      } catch (error) {
        console.error("Error fetching output volume:", error.message);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  /**
   * GET /reports/usage/rework-signals
   * Returns daily count of response regenerations
   */
  app.get(
    "/reports/usage/rework-signals",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { startDate, endDate, workspaceId } = request.query;

        if (!startDate || !endDate) {
          return response.status(400).json({
            success: false,
            error: "startDate and endDate query parameters are required",
          });
        }

        const start = AzureInsightsClient.parseDate(startDate);
        const end = AzureInsightsClient.parseDate(endDate);

        if (start >= end) {
          return response.status(400).json({
            success: false,
            error: "startDate must be before endDate",
          });
        }

        if (!insightsConnectionString) {
          return response.json({
            success: true,
            data: [],
            warning: "App Insights not configured",
          });
        }

        const client = new AzureInsightsClient(insightsConnectionString, insightsKey);

        // KQL query for rework signals
        let kql = `customEvents
          | where name == 'UserAction_RegenerateResponse'
          | where timestamp >= datetime('${start.toISOString()}') and timestamp <= datetime('${end.toISOString()}')`;
        
        if (workspaceId) {
          kql += `\n          | where tostring(customDimensions["workspaceId"]) == '${workspaceId}'`;
        }
        
        kql += `\n          | summarize count() by bin(timestamp, 1d)
          | order by timestamp asc`;

        const results = await client.executeQuery(kql, { limit: 1000 });

        const data = results.map((row) => ({
          timestamp: row.timestamp,
          count: row.count_ || 0,
        }));

        response.json({
          success: true,
          data,
          query: "rework_signals_daily",
        });
      } catch (error) {
        console.error("Error fetching rework signals:", error.message);
        response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );
}

module.exports = { reportEndpoints };
