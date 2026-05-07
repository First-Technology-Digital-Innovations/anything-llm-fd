const axios = require("axios");

/**
 * Utility for executing KQL queries against Azure Application Insights
 * Uses the Query API via REST endpoints
 */

class AzureInsightsClient {
  constructor(connectionString, apikey) {
    if (!connectionString) {
      throw new Error(
        "Azure App Insights connection string is required but not provided"
      );
    }
    if (!apikey) {
      throw new Error("Azure App Insights API key is required but not provided");
    }
    this.connectionString = connectionString;
    this.appId = this._extractAppId(connectionString);
    this.apiKey = apikey;

    if (!this.appId) {
      throw new Error(
        "Could not extract App ID from connection string"
      );
    }
  }

  /**
   * Extract Application Insights App ID from connection string
   * Format: InstrumentationKey=xxx;...ApplicationId=yyy;...
   */
  _extractAppId(connStr) {
    const match = connStr.match(/ApplicationId=([^;]+)/);
    return match ? match[1] : null;
  }

  /**
   * Execute a KQL query against Application Insights
   * @param {string} kql - KQL query statement
   * @param {Object} options - Query options
   * @param {string} options.timespan - ISO 8601 duration (e.g., "P7D", "PT30M")
   * @param {number} options.limit - Result limit (default: 10000)
   * @returns {Promise<Array>} Query results
   */
  async executeQuery(kql, options = {}) {
    try {
      const { timespan = "P30D", limit = 10000 } = options;

      const endpoint = `https://api.applicationinsights.io/v1/apps/${this.appId}/query`;

      const response = await axios.get(endpoint, {
        headers: {
          "x-api-key": this.apiKey,
        },
        params: {
          query: kql,
          timespan,
        },
        timeout: 30000,
      });

      // Application Insights API returns data in a specific format
      if (response.data?.tables?.[0]?.rows) {
        const columns = response.data.tables[0].columns.map((c) => c.name);
        const rows = response.data.tables[0].rows;

        // Convert rows to objects using column names
        return rows
          .map((row) => {
            const obj = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          })
          .slice(0, limit);
      }

      return [];
    } catch (error) {
      if (error.response?.status === 401) {
        throw new Error("Unauthorized: Invalid API Key or connection string");
      } else if (error.response?.status === 404) {
        throw new Error("Application Insights App not found");
      } else if (error.code === "ECONNABORTED") {
        throw new Error("Query timeout: took longer than 30 seconds");
      } else {
        throw new Error(
          `Failed to execute KQL query: ${error.message || "Unknown error"}`
        );
      }
    }
  }

  /**
   * Helper: Convert date objects to ISO 8601 timespan format
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {string} ISO 8601 duration string
   */
  static getTimespanFromDates(startDate, endDate) {
    // For now, return a fixed timespan
    // TODO: Calculate duration between dates
    return "P30D";
  }

  /**
   * Parse date string to Date object (handles multiple formats)
   */
  static parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    return date;
  }
}

module.exports = AzureInsightsClient;
