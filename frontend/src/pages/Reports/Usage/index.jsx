import { useEffect, useState } from "react";
import { isMobile } from "react-device-detect";
import { toast } from "react-toastify";
import Skeleton from "react-loading-skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ReportsSidebar from "@/components/ReportsSidebar";
import Reports from "@/models/reports";
import Workspace from "@/models/workspace";
import "react-loading-skeleton/dist/skeleton.css";

const DATE_RANGE_PRESETS = {
  "Last 7 Days": 7,
  "Last 30 Days": 30,
  "Last 90 Days": 90,
};

export default function ReportsUsage() {
  // State management
  const [dateRangePreset, setDateRangePreset] = useState("Last 7 Days");
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data state
  const [promptVolumeData, setPromptVolumeData] = useState([]);
  const [sourceCoverageData, setSourceCoverageData] = useState({
    avgSources: 0,
    percentWithSources: 0,
  });
  const [outputVolumeData, setOutputVolumeData] = useState([]);
  const [reworkSignalsData, setReworkSignalsData] = useState([]);

  // Load workspaces on mount
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const result = await Workspace.all();
        if (result.success && result.workspaces) {
          setWorkspaces(result.workspaces);
        }
      } catch (err) {
        console.error("Error loading workspaces:", err);
      }
    };

    loadWorkspaces();
  }, []);

  // Fetch all metrics when date range or workspace changes
  useEffect(() => {
    fetchAllMetrics();
  }, [dateRangePreset, workspaceId]);

  const fetchAllMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const daysBack = DATE_RANGE_PRESETS[dateRangePreset];
      const { startDate, endDate } = Reports.getDateRange(daysBack);

      const result = await Reports.fetchAllMetrics(
        startDate,
        endDate,
        workspaceId
      );

      // Process prompt volume
      if (result.promptVolume.success) {
        setPromptVolumeData(result.promptVolume.data);
      } else {
        console.error(
          "Prompt volume error:",
          result.promptVolume.error
        );
      }

      // Process source coverage
      if (result.sourceCoverage.success) {
        setSourceCoverageData(result.sourceCoverage.data);
      } else {
        console.error("Source coverage error:", result.sourceCoverage.error);
      }

      // Process output volume
      if (result.outputVolume.success) {
        setOutputVolumeData(result.outputVolume.data);
      } else {
        console.error("Output volume error:", result.outputVolume.error);
      }

      // Process rework signals
      if (result.reworkSignals.success) {
        setReworkSignalsData(result.reworkSignals.data);
      } else {
        console.error("Rework signals error:", result.reworkSignals.error);
      }

      // Check if any had errors
      const hasErrors = [
        result.promptVolume,
        result.sourceCoverage,
        result.outputVolume,
        result.reworkSignals,
      ].some((r) => !r.success);

      if (hasErrors) {
        setError(
          "Some metrics failed to load. Please try again or contact support."
        );
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError("Failed to fetch report data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAllMetrics();
    toast.success("Metrics refreshed!");
  };

  const MetricCard = ({ label, value, suffix = "" }) => (
    <div className="bg-theme-bg-primary rounded-lg p-4 border border-theme-border">
      <p className="text-xs text-theme-text-secondary font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-bold text-theme-text-primary mt-2">
        {loading ? (
          <Skeleton width={100} />
        ) : (
          `${value.toFixed(2)}${suffix}`
        )}
      </p>
    </div>
  );

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <ReportsSidebar />
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px] bg-theme-bg-secondary w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        <div className="flex flex-col w-full px-1 md:pl-6 md:pr-[50px] md:py-6 py-16">
          {/* Header */}
          <div className="w-full flex flex-col gap-y-1 pb-6 border-white/10 border-b-2">
            <div className="items-center flex gap-x-4">
              <p className="text-lg leading-6 font-bold text-theme-text-primary">
                Usage
              </p>
            </div>
            <p className="text-xs leading-[18px] font-base text-theme-text-secondary">
              View usage analytics and statistics for your workspace.
            </p>
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div className="flex gap-2 flex-wrap">
              {Object.keys(DATE_RANGE_PRESETS).map((preset) => (
                <button
                  key={preset}
                  onClick={() => setDateRangePreset(preset)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    dateRangePreset === preset
                      ? "bg-blue-600 text-white"
                      : "bg-theme-bg-primary text-theme-text-secondary hover:bg-theme-bg-tertiary"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex gap-3 md:flex-row flex-col">
              {/* <select
                value={workspaceId || ""}
                onChange={(e) =>
                  setWorkspaceId(e.target.value ? e.target.value : null)
                }
                className="px-3 py-1 rounded text-xs bg-theme-bg-primary text-theme-text-primary border border-theme-border focus:outline-none focus:border-blue-500"
              >
                <option value="">All Workspaces</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select> */}

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Source Coverage - Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <MetricCard
              label="Avg. References per Response"
              value={sourceCoverageData.avgSources}
            />
            <MetricCard
              label="Responses with Sources"
              value={sourceCoverageData.percentWithSources}
              suffix="%"
            />
          </div>

          {/* Prompt Volume Chart */}
          <div className="mb-8 bg-theme-bg-primary p-4 rounded-lg border border-theme-border">
            <h3 className="text-sm font-semibold text-theme-text-primary mb-4">
              Daily Prompt Volume
            </h3>
            {loading ? (
              <Skeleton height={300} />
            ) : promptVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={promptVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #444",
                    }}
                    formatter={(value) => [value, "Prompts"]}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString()
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    dot={false}
                    name="Prompts"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-theme-text-secondary">No data available</p>
            )}
          </div>

          {/* Output Volume Chart */}
          <div className="mb-8 bg-theme-bg-primary p-4 rounded-lg border border-theme-border">
            <h3 className="text-sm font-semibold text-theme-text-primary mb-4">
              Daily Output Volume
            </h3>
            {loading ? (
              <Skeleton height={300} />
            ) : outputVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={outputVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #444",
                    }}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString()
                    }
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgTokens"
                    stroke="#10b981"
                    dot={false}
                    name="Avg Tokens"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalTokens"
                    stroke="#f59e0b"
                    dot={false}
                    name="Total Tokens"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-theme-text-secondary">No data available</p>
            )}
          </div>

          {/* Rework Signals Chart */}
          <div className="mb-8 bg-theme-bg-primary p-4 rounded-lg border border-theme-border">
            <h3 className="text-sm font-semibold text-theme-text-primary mb-4">
              Daily Rework Signals (Regenerations)
            </h3>
            {loading ? (
              <Skeleton height={300} />
            ) : reworkSignalsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reworkSignalsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString()
                    }
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #444",
                    }}
                    formatter={(value) => [value, "Regenerations"]}
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString()
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ef4444"
                    dot={false}
                    name="Regenerations"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-theme-text-secondary">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
