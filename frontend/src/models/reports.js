import { baseHeaders } from "@/utils/request";

const API_BASE = import.meta.env.VITE_API_BASE;

const Reports = {
  /**
   * Fetch daily prompt volume from backend
   * @param {string} startDate - ISO 8601 date string
   * @param {string} endDate - ISO 8601 date string
   * @param {string|null} workspaceId - Optional workspace ID for filtering
   * @returns {Promise<{success: boolean, data: Array, error?: string}>}
   */
  promptVolume: async function (startDate, endDate, workspaceId = null) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...(workspaceId && { workspaceId }),
    });

    return fetch(
      `${API_BASE}/reports/usage/prompt-volume?${params.toString()}`,
      {
        method: "GET",
        headers: baseHeaders(),
      }
    )
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        data: [],
        error: e.message,
      }));
  },

  /**
   * Fetch source coverage metrics from backend
   * @param {string} startDate - ISO 8601 date string
   * @param {string} endDate - ISO 8601 date string
   * @param {string|null} workspaceId - Optional workspace ID for filtering
   * @returns {Promise<{success: boolean, data: {avgSources: number, percentWithSources: number}, error?: string}>}
   */
  sourceCoverage: async function (startDate, endDate, workspaceId = null) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...(workspaceId && { workspaceId }),
    });

    return fetch(
      `${API_BASE}/reports/usage/source-coverage?${params.toString()}`,
      {
        method: "GET",
        headers: baseHeaders(),
      }
    )
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        data: { avgSources: 0, percentWithSources: 0 },
        error: e.message,
      }));
  },

  /**
   * Fetch output volume metrics from backend
   * @param {string} startDate - ISO 8601 date string
   * @param {string} endDate - ISO 8601 date string
   * @param {string|null} workspaceId - Optional workspace ID for filtering
   * @returns {Promise<{success: boolean, data: Array, error?: string}>}
   */
  outputVolume: async function (startDate, endDate, workspaceId = null) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...(workspaceId && { workspaceId }),
    });

    return fetch(
      `${API_BASE}/reports/usage/output-volume?${params.toString()}`,
      {
        method: "GET",
        headers: baseHeaders(),
      }
    )
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        data: [],
        error: e.message,
      }));
  },

  /**
   * Fetch rework signals from backend
   * @param {string} startDate - ISO 8601 date string
   * @param {string} endDate - ISO 8601 date string
   * @param {string|null} workspaceId - Optional workspace ID for filtering
   * @returns {Promise<{success: boolean, data: Array, error?: string}>}
   */
  reworkSignals: async function (startDate, endDate, workspaceId = null) {
    const params = new URLSearchParams({
      startDate,
      endDate,
      ...(workspaceId && { workspaceId }),
    });

    return fetch(
      `${API_BASE}/reports/usage/rework-signals?${params.toString()}`,
      {
        method: "GET",
        headers: baseHeaders(),
      }
    )
      .then((res) => res.json())
      .catch((e) => ({
        success: false,
        data: [],
        error: e.message,
      }));
  },

  /**
   * Utility: Calculate date range based on days back
   * @param {number} daysBack - Number of days to go back
   * @returns {{startDate: string, endDate: string}}
   */
  getDateRange: function (daysBack) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    endDate.setDate(endDate.getDate() + 1);

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  },

  /**
   * Fetch all report data at once
   * @param {string} startDate
   * @param {string} endDate
   * @param {string|null} workspaceId
   * @returns {Promise<{promptVolume, sourceCoverage, outputVolume, reworkSignals}>}
   */
  fetchAllMetrics: async function (startDate, endDate, workspaceId = null) {
    try {
      const [promptVolume, sourceCoverage, outputVolume, reworkSignals] =
        await Promise.all([
          this.promptVolume(startDate, endDate, workspaceId),
          this.sourceCoverage(startDate, endDate, workspaceId),
          this.outputVolume(startDate, endDate, workspaceId),
          this.reworkSignals(startDate, endDate, workspaceId),
        ]);

      return {
        promptVolume,
        sourceCoverage,
        outputVolume,
        reworkSignals,
      };
    } catch (error) {
      console.error("Error fetching all metrics:", error);
      return {
        promptVolume: { success: false, data: [], error: error.message },
        sourceCoverage: {
          success: false,
          data: { avgSources: 0, percentWithSources: 0 },
          error: error.message,
        },
        outputVolume: { success: false, data: [], error: error.message },
        reworkSignals: { success: false, data: [], error: error.message },
      };
    }
  },
};

export default Reports;
